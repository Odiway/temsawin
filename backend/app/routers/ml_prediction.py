"""
ML Prediction Router — Surrogate model for VECTO simulation.
Trains Random Forest + Linear Regression on real .vsum data.
Predicts FC (g/km) and CO2 (g/km) from vehicle parameters
WITHOUT running full VECTO simulation.

Based on physics: F_total = F_rolling + F_aero + F_gradient + F_acceleration
Adapted from: github.com/Nikhilsanap03/-EV-Energy-Consumption-Prediction-using-Machine-Learning
"""
import csv
import io
import json
import logging
from pathlib import Path
from typing import Optional

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ml-prediction", tags=["ML Prediction"])

VSUM_DIR = Path("/app/Output Files")
if not VSUM_DIR.exists():
    VSUM_DIR = Path("Output Files")

# ─── Pydantic models ─────────────────────────────────────────────

class PredictionInput(BaseModel):
    total_mass_kg: float
    avg_speed_kmh: float
    cdxa: float
    total_rrc: float
    engine_power_kw: float
    mission: str  # Coach, HeavyUrban, Interurban, Suburban, Urban


class AllMissionsInput(BaseModel):
    total_mass_kg: float
    avg_speed_kmh: float
    cdxa: float
    total_rrc: float
    engine_power_kw: float


class SweepInput(BaseModel):
    total_mass_kg: float
    avg_speed_kmh: float
    cdxa: float
    total_rrc: float
    engine_power_kw: float
    mission: str
    sweep_param: str  # which parameter to sweep
    sweep_min: float
    sweep_max: float
    sweep_steps: int = 20


class PredictionResult(BaseModel):
    fc_predicted_g_km: float
    co2_predicted_g_km: float
    model_used: str
    confidence_r2: float


# ─── Data parsing (reuses vsum_analytics pattern) ────────────────

def _safe_float(val) -> Optional[float]:
    if val is None or str(val).strip() in ("", "NaN", "N/A", "-"):
        return None
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return None


def _mission_label(cycle: str) -> str:
    return cycle.replace(".vdri", "").replace(".json", "").strip()


def _parse_training_data() -> list[dict]:
    """Extract features + targets from .vsum files for ML training."""
    rows = []
    for vsum_path in sorted(VSUM_DIR.glob("*.vsum")):
        try:
            content = vsum_path.read_text(encoding="utf-8-sig")
        except Exception as e:
            logger.error(f"Failed to read {vsum_path}: {e}")
            continue

        lines = [l for l in content.splitlines() if not l.startswith("#")]
        if len(lines) < 2:
            continue

        csv_reader = csv.reader(io.StringIO("\n".join(lines)))
        fields = [f.strip() for f in next(csv_reader)]

        for values in csv_reader:
            if len(values) < 10:
                continue

            raw = {}
            for i, field in enumerate(fields):
                if i < len(values):
                    raw[field] = values[i].strip()

            status = raw.get("Status", "")
            if status.lower() != "success":
                continue

            # Features
            total_mass = _safe_float(raw.get("Total vehicle mass [kg]"))
            avg_speed = _safe_float(raw.get("speed [km/h]"))
            cdxa = _safe_float(raw.get("CdxA [m²]"))
            total_rrc = _safe_float(raw.get("total RRC [-]"))
            engine_power = _safe_float(raw.get("Engine rated power [kW]"))
            mission = _mission_label(raw.get("Cycle [-]", ""))

            # Targets
            fc_final = _safe_float(raw.get("FC-Final [g/km]"))
            co2 = _safe_float(raw.get("CO2 [g/km]"))

            # Energy breakdown (additional features)
            e_air = _safe_float(raw.get("E_air [kWh]"))
            e_roll = _safe_float(raw.get("E_roll [kWh]"))
            e_grad = _safe_float(raw.get("E_grad [kWh]"))
            e_inertia = _safe_float(raw.get("E_vehi_inertia [kWh]"))
            e_aux = _safe_float(raw.get("E_aux_sum [kWh]"))
            distance = _safe_float(raw.get("distance [km]"))
            loading = _safe_float(raw.get("Loading [kg]"))

            # Skip if essential features/targets are missing
            if any(v is None for v in [total_mass, avg_speed, cdxa, total_rrc,
                                        engine_power, fc_final, co2, distance]):
                continue

            # Compute energy intensities (kWh/km) as features
            e_air_km = (e_air / distance) if (e_air and distance and distance > 0) else 0
            e_roll_km = (e_roll / distance) if (e_roll and distance and distance > 0) else 0
            e_grad_km = (e_grad / distance) if (e_grad and distance and distance > 0) else 0
            e_inertia_km = (e_inertia / distance) if (e_inertia and distance and distance > 0) else 0
            e_aux_km = (e_aux / distance) if (e_aux and distance and distance > 0) else 0

            rows.append({
                "total_mass_kg": total_mass,
                "avg_speed_kmh": avg_speed,
                "cdxa": cdxa,
                "total_rrc": total_rrc,
                "engine_power_kw": engine_power,
                "loading_kg": loading or 0,
                "mission": mission,
                "distance_km": distance,
                "e_air_km": e_air_km,
                "e_roll_km": e_roll_km,
                "e_grad_km": e_grad_km,
                "e_inertia_km": e_inertia_km,
                "e_aux_km": e_aux_km,
                "fc_final_g_km": fc_final,
                "co2_g_km": co2,
            })

    return rows


# ─── Model training ──────────────────────────────────────────────

class VECTOSurrogateModel:
    """Trains Random Forest + Linear Regression on real VECTO .vsum data."""

    def __init__(self):
        self.rf_fc = None
        self.rf_co2 = None
        self.lr_fc = None
        self.lr_co2 = None
        self.scaler = None
        self.mission_encoder = {}
        self.mission_energy_profiles = {}  # avg energy values per mission
        self.feature_names = []
        self.is_trained = False
        self.training_stats = {}

    def train(self):
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.linear_model import LinearRegression
        from sklearn.model_selection import cross_val_score
        from sklearn.preprocessing import StandardScaler

        rows = _parse_training_data()
        if len(rows) < 10:
            raise ValueError(f"Insufficient training data: {len(rows)} rows (need >= 10)")

        # Mission encoding
        missions = sorted(set(r["mission"] for r in rows))
        self.mission_encoder = {m: i for i, m in enumerate(missions)}

        # Build feature matrix
        self.feature_names = [
            "total_mass_kg", "avg_speed_kmh", "cdxa", "total_rrc",
            "engine_power_kw", "loading_kg", "mission_encoded",
            "e_air_km", "e_roll_km", "e_grad_km", "e_inertia_km", "e_aux_km",
            # Physics-derived features
            "mass_x_rrc",  # rolling resistance proxy
            "speed_sq_x_cdxa",  # aero drag proxy
            "mass_x_speed",  # momentum proxy
        ]

        X = []
        y_fc = []
        y_co2 = []

        for r in rows:
            mission_enc = self.mission_encoder.get(r["mission"], 0)
            speed_ms = r["avg_speed_kmh"] / 3.6

            features = [
                r["total_mass_kg"],
                r["avg_speed_kmh"],
                r["cdxa"],
                r["total_rrc"],
                r["engine_power_kw"],
                r["loading_kg"],
                mission_enc,
                r["e_air_km"],
                r["e_roll_km"],
                r["e_grad_km"],
                r["e_inertia_km"],
                r["e_aux_km"],
                # Physics-derived
                r["total_mass_kg"] * r["total_rrc"],  # F_rolling proxy
                (speed_ms ** 2) * r["cdxa"],  # F_aero proxy
                r["total_mass_kg"] * r["avg_speed_kmh"],  # momentum
            ]

            X.append(features)
            y_fc.append(r["fc_final_g_km"])
            y_co2.append(r["co2_g_km"])

        X = np.array(X)
        y_fc = np.array(y_fc)
        y_co2 = np.array(y_co2)

        # Compute per-mission average energy profiles for prediction
        mission_energy = {}
        for r in rows:
            m = r["mission"]
            if m not in mission_energy:
                mission_energy[m] = {"e_air": [], "e_roll": [], "e_grad": [], "e_inertia": [], "e_aux": [], "loading": [], "speed": []}
            mission_energy[m]["e_air"].append(r["e_air_km"])
            mission_energy[m]["e_roll"].append(r["e_roll_km"])
            mission_energy[m]["e_grad"].append(r["e_grad_km"])
            mission_energy[m]["e_inertia"].append(r["e_inertia_km"])
            mission_energy[m]["e_aux"].append(r["e_aux_km"])
            mission_energy[m]["loading"].append(r["loading_kg"])
            mission_energy[m]["speed"].append(r["avg_speed_kmh"])
        self.mission_energy_profiles = {
            m: {k: float(np.mean(v)) for k, v in vals.items()}
            for m, vals in mission_energy.items()
        }

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train Random Forest
        self.rf_fc = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        self.rf_co2 = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        self.rf_fc.fit(X_scaled, y_fc)
        self.rf_co2.fit(X_scaled, y_co2)

        # Train Linear Regression
        self.lr_fc = LinearRegression()
        self.lr_co2 = LinearRegression()
        self.lr_fc.fit(X_scaled, y_fc)
        self.lr_co2.fit(X_scaled, y_co2)

        # Cross-validation scores
        rf_fc_scores = cross_val_score(self.rf_fc, X_scaled, y_fc, cv=min(5, len(rows)), scoring="r2")
        rf_co2_scores = cross_val_score(self.rf_co2, X_scaled, y_co2, cv=min(5, len(rows)), scoring="r2")
        lr_fc_scores = cross_val_score(self.lr_fc, X_scaled, y_fc, cv=min(5, len(rows)), scoring="r2")
        lr_co2_scores = cross_val_score(self.lr_co2, X_scaled, y_co2, cv=min(5, len(rows)), scoring="r2")

        # Feature importance
        fi = self.rf_fc.feature_importances_
        feature_importance = sorted(
            [{"feature": self.feature_names[i], "importance": round(float(fi[i]), 4)}
             for i in range(len(self.feature_names))],
            key=lambda x: x["importance"],
            reverse=True
        )

        self.training_stats = {
            "n_samples": len(rows),
            "n_features": len(self.feature_names),
            "missions": missions,
            "models": {
                "random_forest": {
                    "fc_r2": round(float(np.mean(rf_fc_scores)), 4),
                    "fc_r2_std": round(float(np.std(rf_fc_scores)), 4),
                    "co2_r2": round(float(np.mean(rf_co2_scores)), 4),
                    "co2_r2_std": round(float(np.std(rf_co2_scores)), 4),
                },
                "linear_regression": {
                    "fc_r2": round(float(np.mean(lr_fc_scores)), 4),
                    "fc_r2_std": round(float(np.std(lr_fc_scores)), 4),
                    "co2_r2": round(float(np.mean(lr_co2_scores)), 4),
                    "co2_r2_std": round(float(np.std(lr_co2_scores)), 4),
                },
            },
            "feature_importance": feature_importance,
            "target_stats": {
                "fc_mean": round(float(np.mean(y_fc)), 2),
                "fc_std": round(float(np.std(y_fc)), 2),
                "fc_min": round(float(np.min(y_fc)), 2),
                "fc_max": round(float(np.max(y_fc)), 2),
                "co2_mean": round(float(np.mean(y_co2)), 2),
                "co2_std": round(float(np.std(y_co2)), 2),
                "co2_min": round(float(np.min(y_co2)), 2),
                "co2_max": round(float(np.max(y_co2)), 2),
            },
            # Actual vs Predicted for chart
            "actual_vs_predicted": {
                "fc": [
                    {"actual": round(float(y_fc[i]), 2),
                     "rf_predicted": round(float(self.rf_fc.predict(X_scaled[i:i+1])[0]), 2),
                     "lr_predicted": round(float(self.lr_fc.predict(X_scaled[i:i+1])[0]), 2),
                     "mission": rows[i]["mission"],
                     "mass": rows[i]["total_mass_kg"]}
                    for i in range(len(rows))
                ],
                "co2": [
                    {"actual": round(float(y_co2[i]), 2),
                     "rf_predicted": round(float(self.rf_co2.predict(X_scaled[i:i+1])[0]), 2),
                     "lr_predicted": round(float(self.lr_co2.predict(X_scaled[i:i+1])[0]), 2),
                     "mission": rows[i]["mission"],
                     "mass": rows[i]["total_mass_kg"]}
                    for i in range(len(rows))
                ],
            },
        }

        self.is_trained = True
        logger.info(
            f"ML model trained: {len(rows)} samples, "
            f"RF FC R²={np.mean(rf_fc_scores):.4f}, "
            f"RF CO2 R²={np.mean(rf_co2_scores):.4f}"
        )

    def predict(self, inp: PredictionInput) -> dict:
        if not self.is_trained:
            raise ValueError("Model not trained yet")

        mission_enc = self.mission_encoder.get(inp.mission, 0)
        speed_ms = inp.avg_speed_kmh / 3.6

        # Use per-mission average energy profiles from training data
        # Scale by ratio of input params vs mission average params
        profile = self.mission_energy_profiles.get(inp.mission)
        if profile:
            avg_speed = profile["speed"]
            speed_ratio = (inp.avg_speed_kmh / avg_speed) if avg_speed > 0 else 1.0
            e_air_est = profile["e_air"] * (speed_ratio ** 2)
            e_roll_est = profile["e_roll"]
            e_grad_est = profile["e_grad"]
            e_inertia_est = profile["e_inertia"] * speed_ratio
            e_aux_est = profile["e_aux"]
            loading_est = profile["loading"]
        else:
            g = 9.81
            rho = 1.188
            e_roll_est = (inp.total_rrc * inp.total_mass_kg * g / 3600)
            e_air_est = (0.5 * rho * inp.cdxa * (speed_ms ** 2)) / 3600
            e_grad_est = 0
            e_inertia_est = 0
            e_aux_est = 0.5
            loading_est = 0

        features = np.array([[
            inp.total_mass_kg,
            inp.avg_speed_kmh,
            inp.cdxa,
            inp.total_rrc,
            inp.engine_power_kw,
            loading_est,
            mission_enc,
            e_air_est,
            e_roll_est,
            e_grad_est,
            e_inertia_est,
            e_aux_est,
            inp.total_mass_kg * inp.total_rrc,
            (speed_ms ** 2) * inp.cdxa,
            inp.total_mass_kg * inp.avg_speed_kmh,
        ]])

        features_scaled = self.scaler.transform(features)

        rf_fc = float(self.rf_fc.predict(features_scaled)[0])
        rf_co2 = float(self.rf_co2.predict(features_scaled)[0])
        lr_fc = float(self.lr_fc.predict(features_scaled)[0])
        lr_co2 = float(self.lr_co2.predict(features_scaled)[0])

        rf_r2 = self.training_stats["models"]["random_forest"]["fc_r2"]
        lr_r2 = self.training_stats["models"]["linear_regression"]["fc_r2"]

        return {
            "random_forest": {
                "fc_g_km": round(rf_fc, 2),
                "co2_g_km": round(rf_co2, 2),
                "r2": rf_r2,
            },
            "linear_regression": {
                "fc_g_km": round(lr_fc, 2),
                "co2_g_km": round(lr_co2, 2),
                "r2": lr_r2,
            },
            "recommended": "random_forest" if rf_r2 >= lr_r2 else "linear_regression",
            "input": inp.model_dump(),
            "physics_estimates": {
                "e_roll_kwh_km": round(e_roll_est, 4),
                "e_air_kwh_km": round(e_air_est, 4),
            },
        }


# Singleton model
_model = VECTOSurrogateModel()


# ─── Endpoints ────────────────────────────────────────────────────

@router.post("/train")
async def train_model():
    """Train the ML model on real VECTO .vsum data."""
    try:
        _model.train()
        return {"status": "success", "stats": _model.training_stats}
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def model_status():
    """Get current model training status and stats."""
    return {
        "is_trained": _model.is_trained,
        "stats": _model.training_stats if _model.is_trained else None,
    }


@router.post("/predict")
async def predict(inp: PredictionInput):
    """Predict FC and CO2 for given vehicle parameters."""
    if not _model.is_trained:
        # Auto-train on first prediction
        try:
            _model.train()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auto-training failed: {e}")

    try:
        result = _model.predict(inp)
        return result
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/training-data")
async def get_training_data():
    """Return the training data for visualization."""
    if not _model.is_trained:
        try:
            _model.train()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auto-training failed: {e}")

    return _model.training_stats


def _ensure_trained():
    if not _model.is_trained:
        try:
            _model.train()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auto-training failed: {e}")


@router.post("/predict-all-missions")
async def predict_all_missions(inp: AllMissionsInput):
    """Predict FC and CO2 for ALL missions with the same vehicle params."""
    _ensure_trained()
    missions = sorted(_model.mission_encoder.keys())
    results = []
    for mission in missions:
        try:
            pred_inp = PredictionInput(
                total_mass_kg=inp.total_mass_kg,
                avg_speed_kmh=inp.avg_speed_kmh,
                cdxa=inp.cdxa,
                total_rrc=inp.total_rrc,
                engine_power_kw=inp.engine_power_kw,
                mission=mission,
            )
            r = _model.predict(pred_inp)
            results.append({
                "mission": mission,
                "rf_fc": r["random_forest"]["fc_g_km"],
                "rf_co2": r["random_forest"]["co2_g_km"],
                "lr_fc": r["linear_regression"]["fc_g_km"],
                "lr_co2": r["linear_regression"]["co2_g_km"],
            })
        except Exception as e:
            logger.error(f"Prediction failed for {mission}: {e}")
    return {"results": results, "input": inp.model_dump()}


@router.post("/sweep")
async def sweep_parameter(inp: SweepInput):
    """Sweep one parameter across a range and return predictions."""
    _ensure_trained()
    allowed = {"total_mass_kg", "avg_speed_kmh", "cdxa", "total_rrc", "engine_power_kw"}
    if inp.sweep_param not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid sweep_param. Must be one of: {allowed}")
    steps = max(2, min(inp.sweep_steps, 50))
    values = [round(inp.sweep_min + i * (inp.sweep_max - inp.sweep_min) / (steps - 1), 6)
              for i in range(steps)]
    results = []
    base = inp.model_dump(exclude={"sweep_param", "sweep_min", "sweep_max", "sweep_steps"})
    for val in values:
        params = {**base, inp.sweep_param: val}
        try:
            pred_inp = PredictionInput(**params)
            r = _model.predict(pred_inp)
            results.append({
                "x": round(val, 4),
                "rf_fc": r["random_forest"]["fc_g_km"],
                "rf_co2": r["random_forest"]["co2_g_km"],
                "lr_fc": r["linear_regression"]["fc_g_km"],
                "lr_co2": r["linear_regression"]["co2_g_km"],
            })
        except Exception as e:
            logger.error(f"Sweep prediction failed for {val}: {e}")
    return {
        "sweep_param": inp.sweep_param,
        "results": results,
        "base_input": base,
    }
