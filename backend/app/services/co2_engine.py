"""
CO2 Emissions Calculation Engine
Based on VECTO methodology for heavy-duty vehicles (EU Regulation 2017/2400).

Key formula:
  CO2 [g/km] = FC_corrected [g/km] × EF_diesel
  
Where:
  FC_corrected = FC_base × WHTC_cycle × BFColdHot × CFRegPer × CFNCV
  EF_diesel = 3.169 g CO2 / g fuel (EN 590 diesel standard)
  
BSFC = FuelConsumption(g/h) / Power(kW) → g/kWh  
"""
import math
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# EU standard diesel CO2 emission factor (g CO2 per g fuel)
EF_DIESEL = 3.169
# Diesel density (kg/L) for L/100km conversion
DIESEL_DENSITY = 0.832
# Gravity
G = 9.81


def calculate_bsfc_map(fuel_map_points: list[dict]) -> list[dict]:
    """
    Calculate Brake-Specific Fuel Consumption for each operating point.
    BSFC = FC(g/h) / Power(kW)
    Power = RPM × Torque × π / 30000
    
    Returns list of {rpm, torque, fc_g_h, power_kw, bsfc_g_kwh}
    """
    results = []
    for p in fuel_map_points:
        rpm = float(p["engine_speed"])
        torque = float(p["torque"])
        fc = float(p["fuel_consumption"])
        
        # Mechanical power in kW
        power_kw = (rpm * torque * math.pi) / 30000.0
        
        # BSFC only meaningful for positive power
        bsfc = None
        if power_kw > 0.1:
            bsfc = round(fc / power_kw, 2)
        
        results.append({
            "rpm": rpm,
            "torque": torque,
            "fc_g_h": round(fc, 2),
            "power_kw": round(power_kw, 3),
            "bsfc_g_kwh": bsfc,
        })
    
    return results


def find_optimal_operating_point(fuel_map_points: list[dict]) -> dict:
    """Find the RPM/Torque point with minimum BSFC (best efficiency)."""
    bsfc_map = calculate_bsfc_map(fuel_map_points)
    valid = [p for p in bsfc_map if p["bsfc_g_kwh"] is not None and p["bsfc_g_kwh"] > 0]
    
    if not valid:
        return {"rpm": 0, "torque": 0, "bsfc_g_kwh": 0, "power_kw": 0}
    
    best = min(valid, key=lambda x: x["bsfc_g_kwh"])
    return {
        "rpm": best["rpm"],
        "torque": best["torque"],
        "bsfc_g_kwh": best["bsfc_g_kwh"],
        "power_kw": best["power_kw"],
        "fc_g_h": best["fc_g_h"],
    }


def calculate_co2_estimates(
    fuel_map_points: list[dict],
    rated_power_w: Optional[int],
    max_laden_mass_kg: Optional[int],
    whtc_urban: Optional[float] = None,
    whtc_rural: Optional[float] = None,
    whtc_motorway: Optional[float] = None,
    bf_cold_hot: Optional[float] = None,
    cf_reg_per: Optional[float] = None,
    cf_ncv: Optional[float] = None,
    rrc_declared: Optional[float] = None,
) -> dict:
    """
    Estimate CO2 emissions using VECTO-simplified methodology.
    
    Returns dict with:
      - bsfc_optimal: best efficiency point
      - co2_urban/rural/motorway/weighted: corrected CO2 estimates
      - fuel_l_100km_*: fuel consumption in L/100km for each cycle
      - efficiency_map_summary: BSFC distribution statistics
    """
    if not fuel_map_points:
        return {"error": "No fuel map data"}
    
    # Default correction factors (if not available from XML)
    whtc_u = whtc_urban or 1.08
    whtc_r = whtc_rural or 1.01
    whtc_m = whtc_motorway or 1.00
    bf = bf_cold_hot or 1.005
    cf_r = cf_reg_per or 1.0
    cf_n = cf_ncv or 0.994
    
    # Calculate BSFC map
    bsfc_map = calculate_bsfc_map(fuel_map_points)
    valid_bsfc = [p["bsfc_g_kwh"] for p in bsfc_map if p["bsfc_g_kwh"] and p["bsfc_g_kwh"] > 0]
    
    if not valid_bsfc:
        return {"error": "No valid BSFC points"}
    
    optimal = find_optimal_operating_point(fuel_map_points)
    
    # BSFC statistics
    avg_bsfc = sum(valid_bsfc) / len(valid_bsfc)
    min_bsfc = min(valid_bsfc)
    max_bsfc = max(valid_bsfc)
    p25_bsfc = sorted(valid_bsfc)[len(valid_bsfc) // 4]
    p75_bsfc = sorted(valid_bsfc)[3 * len(valid_bsfc) // 4]
    
    # Typical cycle-representative BSFC values
    # Urban: engines operate at higher BSFC (more transient, lower efficiency)
    # Rural: mid-range BSFC
    # Motorway: closer to optimal BSFC
    urban_bsfc = p75_bsfc  # 75th percentile (less efficient operation)
    rural_bsfc = avg_bsfc   # average operation
    motorway_bsfc = p25_bsfc  # 25th percentile (more efficient operation)
    
    rated_power_kw = (rated_power_w / 1000.0) if rated_power_w else 250.0
    mass_kg = max_laden_mass_kg or 19000
    
    # Typical cycle parameters for M3 buses (from VECTO standard cycles)
    # Average speed and power demand fractions
    cycles = {
        "urban": {
            "avg_speed_kmh": 18,
            "power_fraction": 0.35,  # fraction of rated power used on average
            "bsfc": urban_bsfc,
            "whtc": whtc_u,
        },
        "rural": {
            "avg_speed_kmh": 45,
            "power_fraction": 0.45,
            "bsfc": rural_bsfc,
            "whtc": whtc_r,
        },
        "motorway": {
            "avg_speed_kmh": 70,
            "power_fraction": 0.55,
            "bsfc": motorway_bsfc,
            "whtc": whtc_m,
        },
    }
    
    results = {}
    for cycle_name, params in cycles.items():
        # Average power demand
        avg_power = rated_power_kw * params["power_fraction"]
        
        # Base fuel consumption (g/km)
        fc_g_h = params["bsfc"] * avg_power  # g/h
        fc_g_km = fc_g_h / params["avg_speed_kmh"]  # g/km
        
        # Apply correction factors
        fc_corrected = fc_g_km * params["whtc"] * bf * cf_r * cf_n
        
        # CO2 (g/km)
        co2_g_km = fc_corrected * EF_DIESEL
        
        # Fuel consumption (L/100km)
        fuel_l_100km = (fc_corrected * 100) / (DIESEL_DENSITY * 1000)
        
        results[f"co2_{cycle_name}"] = round(co2_g_km, 1)
        results[f"fuel_l_100km_{cycle_name}"] = round(fuel_l_100km, 2)
        results[f"fc_g_km_{cycle_name}"] = round(fc_corrected, 2)
    
    # Weighted average (VECTO weighting for M3 buses)
    # Typical split: 50% urban, 25% rural, 25% motorway for city buses
    # Or 20% urban, 40% rural, 40% motorway for coaches
    weight_urban = 0.35
    weight_rural = 0.35
    weight_motorway = 0.30
    
    co2_weighted = (
        results["co2_urban"] * weight_urban +
        results["co2_rural"] * weight_rural +
        results["co2_motorway"] * weight_motorway
    )
    fuel_weighted = (
        results["fuel_l_100km_urban"] * weight_urban +
        results["fuel_l_100km_rural"] * weight_rural +
        results["fuel_l_100km_motorway"] * weight_motorway
    )
    
    # Rolling resistance contribution (if RRC available)
    rrc_info = None
    if rrc_declared and mass_kg:
        f_roll = rrc_declared * mass_kg * G  # Rolling resistance force (N)
        # Power consumed by rolling resistance at reference speed (50 km/h)
        p_roll_kw = f_roll * (50 / 3.6) / 1000.0  # kW
        rrc_info = {
            "rrc": rrc_declared,
            "rolling_force_N": round(f_roll, 1),
            "rolling_power_kw_50kmh": round(p_roll_kw, 2),
            "pct_of_rated": round(p_roll_kw / rated_power_kw * 100, 1),
        }
    
    return {
        "optimal_point": optimal,
        "co2_urban": results["co2_urban"],
        "co2_rural": results["co2_rural"],
        "co2_motorway": results["co2_motorway"],
        "co2_weighted": round(co2_weighted, 1),
        "fuel_l_100km_urban": results["fuel_l_100km_urban"],
        "fuel_l_100km_rural": results["fuel_l_100km_rural"],
        "fuel_l_100km_motorway": results["fuel_l_100km_motorway"],
        "fuel_l_100km_weighted": round(fuel_weighted, 2),
        "correction_factors": {
            "whtc_urban": whtc_u,
            "whtc_rural": whtc_r,
            "whtc_motorway": whtc_m,
            "bf_cold_hot": bf,
            "cf_reg_per": cf_r,
            "cf_ncv": cf_n,
            "has_xml_data": whtc_urban is not None,
        },
        "bsfc_stats": {
            "optimal": round(min_bsfc, 1),
            "average": round(avg_bsfc, 1),
            "worst": round(max_bsfc, 1),
            "p25": round(p25_bsfc, 1),
            "p75": round(p75_bsfc, 1),
            "total_points": len(valid_bsfc),
        },
        "rolling_resistance": rrc_info,
    }


def predict_virtual_variant(
    base_fuel_map: list[dict],
    base_power_w: int,
    base_mass_kg: int,
    target_power_w: int,
    target_mass_kg: int,
    target_axle_ratio: Optional[float] = None,
    base_axle_ratio: Optional[float] = None,
    whtc_factors: Optional[dict] = None,
) -> dict:
    """
    Predict CO2 performance of an untested virtual configuration
    by scaling from a known base variant's fuel map.
    
    Scaling approach:
    - Power scaling: shift operating points proportionally
    - Mass scaling: adjust power demand linearly with mass ratio
    - Axle ratio: affects engine speed at given road speed
    
    This avoids expensive physical VECTO simulation while providing
    reasonable estimates for R&D decision-making.
    """
    if not base_fuel_map:
        return {"error": "No base fuel map data"}
    
    power_ratio = target_power_w / base_power_w if base_power_w else 1.0
    mass_ratio = target_mass_kg / base_mass_kg if base_mass_kg else 1.0
    
    # Scale fuel map: FC scales roughly with power demand
    # When mass increases, power demand increases → FC increases
    # When engine is more powerful, BSFC may be better at partial load
    scaling_factor = mass_ratio / power_ratio  # net load factor
    
    scaled_fuel_map = []
    for p in base_fuel_map:
        scaled_fc = float(p["fuel_consumption"]) * scaling_factor
        scaled_fuel_map.append({
            "engine_speed": p["engine_speed"],
            "torque": float(p["torque"]) * power_ratio,
            "fuel_consumption": scaled_fc,
        })
    
    # Calculate CO2 with scaled map
    whtc = whtc_factors or {}
    co2_result = calculate_co2_estimates(
        fuel_map_points=scaled_fuel_map,
        rated_power_w=target_power_w,
        max_laden_mass_kg=target_mass_kg,
        whtc_urban=whtc.get("urban"),
        whtc_rural=whtc.get("rural"),
        whtc_motorway=whtc.get("motorway"),
        bf_cold_hot=whtc.get("bf_cold_hot"),
        cf_reg_per=whtc.get("cf_reg_per"),
        cf_ncv=whtc.get("cf_ncv"),
    )
    
    co2_result["scaling_info"] = {
        "base_power_kw": round(base_power_w / 1000, 1),
        "target_power_kw": round(target_power_w / 1000, 1),
        "base_mass_kg": base_mass_kg,
        "target_mass_kg": target_mass_kg,
        "power_ratio": round(power_ratio, 3),
        "mass_ratio": round(mass_ratio, 3),
        "net_load_factor": round(scaling_factor, 3),
    }
    co2_result["is_virtual"] = True
    co2_result["confidence"] = _estimate_confidence(power_ratio, mass_ratio)
    
    return co2_result


def _estimate_confidence(power_ratio: float, mass_ratio: float) -> dict:
    """
    Estimate prediction confidence based on how far we're extrapolating.
    Closer to 1.0 ratios = higher confidence.
    """
    power_dev = abs(1.0 - power_ratio)
    mass_dev = abs(1.0 - mass_ratio)
    total_dev = (power_dev + mass_dev) / 2
    
    if total_dev < 0.05:
        level = "high"
        pct = 95
    elif total_dev < 0.15:
        level = "good"
        pct = 85
    elif total_dev < 0.30:
        level = "moderate"
        pct = 70
    else:
        level = "low"
        pct = max(40, int(100 - total_dev * 200))
    
    return {
        "level": level,
        "percentage": pct,
        "note": f"Based on {power_dev*100:.0f}% power delta and {mass_dev*100:.0f}% mass delta from tested variant",
    }
