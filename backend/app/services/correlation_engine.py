"""
Correlation Engine — Compares Digital Twin estimates vs. real VECTO simulation results.
Key for R&D validation: can our simplified engine predict what the full VECTO tool calculates?
"""
import math
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def calculate_correlation(twin_estimates: list[dict], vecto_results: list[dict]) -> dict:
    """
    Compare Digital Twin CO2/FC estimates with real VECTO simulation outputs.
    
    Parameters:
        twin_estimates: list of {variant_code, co2_weighted, fuel_l_100km, ...}
        vecto_results: list of {vin, mission, co2_g_per_km, fc_l_per_100km, ...}
    
    Returns correlation analysis with R², MAPE, bias, per-variant comparisons.
    """
    if not twin_estimates or not vecto_results:
        return {"error": "Insufficient data for correlation", "pairs": []}

    pairs = []
    for vr in vecto_results:
        vin = vr.get("vin", "")
        mission = vr.get("mission", "")
        vecto_co2 = vr.get("co2_g_per_km")
        vecto_fc = vr.get("fc_l_per_100km")

        if not vecto_co2:
            continue

        # Find matching twin estimate (match by model similarity)
        best_match = _find_best_match(vr, twin_estimates)
        if not best_match:
            continue

        twin_co2 = best_match.get("co2_weighted")
        twin_fc = best_match.get("fuel_l_100km")

        if not twin_co2:
            continue

        pair = {
            "vin": vin,
            "variant_code": best_match.get("variant_code", ""),
            "model_name": best_match.get("model_name", ""),
            "mission": mission,
            "loading": vr.get("loading", ""),
            "vecto_co2": round(vecto_co2, 1),
            "twin_co2": round(twin_co2, 1),
            "delta_co2": round(twin_co2 - vecto_co2, 1),
            "delta_pct": round((twin_co2 - vecto_co2) / vecto_co2 * 100, 2) if vecto_co2 else None,
            "vecto_fc": round(vecto_fc, 2) if vecto_fc else None,
            "twin_fc": round(twin_fc, 2) if twin_fc else None,
        }
        pairs.append(pair)

    if not pairs:
        return {"error": "No matching pairs found", "pairs": []}

    # Statistical analysis
    vecto_vals = [p["vecto_co2"] for p in pairs]
    twin_vals = [p["twin_co2"] for p in pairs]
    deltas = [p["delta_co2"] for p in pairs]
    abs_pct_errors = [abs(p["delta_pct"]) for p in pairs if p["delta_pct"] is not None]

    n = len(pairs)
    r_squared = _calc_r_squared(vecto_vals, twin_vals)
    mape = sum(abs_pct_errors) / len(abs_pct_errors) if abs_pct_errors else 0
    bias = sum(deltas) / n
    rmse = math.sqrt(sum(d ** 2 for d in deltas) / n)
    max_error = max(abs_pct_errors) if abs_pct_errors else 0

    # Categorize by mission
    mission_stats = {}
    for p in pairs:
        m = p["mission"]
        if m not in mission_stats:
            mission_stats[m] = {"pairs": [], "vecto": [], "twin": []}
        mission_stats[m]["pairs"].append(p)
        mission_stats[m]["vecto"].append(p["vecto_co2"])
        mission_stats[m]["twin"].append(p["twin_co2"])

    mission_correlation = {}
    for m, data in mission_stats.items():
        m_deltas = [p["delta_co2"] for p in data["pairs"]]
        m_pct = [abs(p["delta_pct"]) for p in data["pairs"] if p["delta_pct"] is not None]
        mission_correlation[m] = {
            "count": len(data["pairs"]),
            "r_squared": _calc_r_squared(data["vecto"], data["twin"]),
            "mape": round(sum(m_pct) / len(m_pct), 2) if m_pct else 0,
            "bias": round(sum(m_deltas) / len(m_deltas), 1),
            "vecto_avg": round(sum(data["vecto"]) / len(data["vecto"]), 1),
            "twin_avg": round(sum(data["twin"]) / len(data["twin"]), 1),
        }

    # Quality rating
    quality = _rate_correlation(r_squared, mape)

    return {
        "summary": {
            "total_pairs": n,
            "r_squared": round(r_squared, 4) if r_squared is not None else None,
            "mape_pct": round(mape, 2),
            "bias_g_km": round(bias, 1),
            "rmse_g_km": round(rmse, 1),
            "max_error_pct": round(max_error, 2),
            "quality": quality,
        },
        "mission_correlation": mission_correlation,
        "pairs": pairs,
        "scatter_data": {
            "vecto": vecto_vals,
            "twin": twin_vals,
            "labels": [f"{p['model_name']} - {p['mission']}" for p in pairs],
        },
    }


def _find_best_match(vecto_result: dict, twin_estimates: list[dict]) -> Optional[dict]:
    """Find the best matching twin estimate for a VECTO result."""
    vecto_model = (vecto_result.get("vehicle_model") or "").upper().replace(" ", "")
    vecto_power = vecto_result.get("engine_rated_power_kw")
    vecto_mass = vecto_result.get("corrected_actual_mass_kg") or vecto_result.get("total_vehicle_mass_kg")

    best = None
    best_score = -1

    for te in twin_estimates:
        score = 0
        te_model = (te.get("model_name") or "").upper().replace(" ", "")

        # Model name similarity
        if te_model and vecto_model:
            # Check if key parts match
            for part in te_model.split():
                if part in vecto_model:
                    score += 10

        # Power match
        te_power = te.get("power_kw")
        if te_power and vecto_power:
            power_diff = abs(te_power - vecto_power) / vecto_power
            if power_diff < 0.01:
                score += 20
            elif power_diff < 0.1:
                score += 10

        # Mass match
        te_mass = te.get("mass_kg")
        if te_mass and vecto_mass:
            mass_diff = abs(te_mass - vecto_mass) / vecto_mass
            if mass_diff < 0.05:
                score += 15
            elif mass_diff < 0.2:
                score += 5

        if score > best_score:
            best_score = score
            best = te

    return best if best_score > 0 else None


def _calc_r_squared(x: list[float], y: list[float]) -> Optional[float]:
    """Calculate R² (coefficient of determination)."""
    n = len(x)
    if n < 2:
        return None

    mean_x = sum(x) / n
    mean_y = sum(y) / n

    ss_tot = sum((yi - mean_y) ** 2 for yi in y)
    if ss_tot == 0:
        return 1.0 if all(abs(xi - yi) < 0.001 for xi, yi in zip(x, y)) else 0.0

    # Pearson correlation
    cov_xy = sum((xi - mean_x) * (yi - mean_y) for xi, yi in zip(x, y))
    ss_x = sum((xi - mean_x) ** 2 for xi in x)
    ss_y = ss_tot

    if ss_x == 0 or ss_y == 0:
        return None

    r = cov_xy / math.sqrt(ss_x * ss_y)
    return round(r ** 2, 4)


def _rate_correlation(r_squared: Optional[float], mape: float) -> dict:
    """Rate the correlation quality."""
    if r_squared is None:
        return {"level": "insufficient", "color": "#484f58", "note": "Yetersiz veri"}

    if r_squared >= 0.95 and mape < 5:
        return {"level": "excellent", "color": "#3fb950", "note": "Mukemmel korelasyon — Production ready"}
    elif r_squared >= 0.85 and mape < 10:
        return {"level": "good", "color": "#58a6ff", "note": "Iyi korelasyon — Guvenilir tahmin"}
    elif r_squared >= 0.70 and mape < 20:
        return {"level": "moderate", "color": "#d29922", "note": "Orta korelasyon — Dikkatli kullanin"}
    else:
        return {"level": "poor", "color": "#f85149", "note": "Dusuk korelasyon — Kalibrasyon gerekli"}
