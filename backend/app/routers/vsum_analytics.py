"""
VSUM Deep Analytics — Parses ALL 196 columns from .vsum files.
Provides data for Energy Sankey, Driving Dynamics, Gear Usage,
Drivetrain Losses, Bus Auxiliary Energy, FC Correction Waterfall,
Loading Sensitivity, Engine Operating Point, ADAS Impact, Component Efficiency.
"""
import csv
import io
import logging
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/vsum-analytics", tags=["VSUM Deep Analytics"])

# --- Configurable output directory ---
VSUM_DIR = Path("/app/Output Files")
if not VSUM_DIR.exists():
    VSUM_DIR = Path("Output Files")


def _safe_float(val) -> Optional[float]:
    if val is None or str(val).strip() in ("", "NaN", "N/A", "-"):
        return None
    try:
        return float(str(val).strip())
    except (ValueError, TypeError):
        return None


def _mission_label(cycle: str) -> str:
    return cycle.replace(".vdri", "").replace(".json", "").strip()


def _parse_all_vsum_files() -> list[dict]:
    """Parse ALL .vsum files from output directory, returning full column data."""
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

        # Use csv.reader to handle quoted values with embedded commas
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

            row = {
                "file": vsum_path.stem,
                "vin": raw.get("VIN number", ""),
                "vehicle_model": raw.get("Vehicle model [-]", ""),
                "vehicle_group": raw.get("HDV CO2 vehicle class [-]", ""),
                "mission": _mission_label(raw.get("Cycle [-]", "")),

                # Mass & loading
                "curb_mass_kg": _safe_float(raw.get("Corrected Actual Curb Mass [kg]")),
                "loading_kg": _safe_float(raw.get("Loading [kg]")),
                "passenger_count": _safe_float(raw.get("Passenger count [-]")),
                "total_mass_kg": _safe_float(raw.get("Total vehicle mass [kg]")),

                # Engine
                "engine_model": raw.get("Engine model [-]", ""),
                "engine_power_kw": _safe_float(raw.get("Engine rated power [kW]")),
                "engine_displacement_cc": _safe_float(raw.get("Engine displacement [ccm]")),
                "engine_idle_rpm": _safe_float(raw.get("Engine idling speed [rpm]")),
                "engine_rated_rpm": _safe_float(raw.get("Engine rated speed [rpm]")),
                "whtc_urban": _safe_float(raw.get("Engine WHTCUrban")),
                "whtc_rural": _safe_float(raw.get("Engine WHTCRural")),
                "whtc_motorway": _safe_float(raw.get("Engine WHTCMotorway")),
                "bf_cold_hot": _safe_float(raw.get("Engine BFColdHot")),

                # Aero & tyres
                "cdxa": _safe_float(raw.get("CdxA [m²]")),
                "total_rrc": _safe_float(raw.get("total RRC [-]")),
                "r_dyn": _safe_float(raw.get("r_dyn [m]")),

                # Gearbox
                "gearbox_model": raw.get("Gearbox model [-]", ""),
                "gearbox_type": raw.get("Gearbox type [-]", ""),
                "gear_ratios": [
                    _safe_float(raw.get(f"Gear {i} Ratio [-]")) for i in range(1, 7)
                ],
                "axle_ratio": _safe_float(raw.get("Axle gear ratio [-]")),

                # ADAS
                "adas_tech": raw.get("ADAS technology combination [-]", ""),
                "shift_strategy": raw.get("ShiftStrategy", ""),
                "aux_tech_fan": raw.get("Auxiliary technology FAN [-]", ""),
                "aux_tech_ac": raw.get("Auxiliary technology AC [-]", ""),
                "aux_tech_ps": raw.get("Auxiliary technology PS [-]", ""),
                "aux_tech_es": raw.get("Auxiliary technology ES [-]", ""),

                # Trip summary
                "time_s": _safe_float(raw.get("time [s]")),
                "distance_km": _safe_float(raw.get("distance [km]")),
                "avg_speed_kmh": _safe_float(raw.get("speed [km/h]")),
                "altitude_delta_m": _safe_float(raw.get("altitudeDelta [m]")),

                # ---- FC Correction Chain (Waterfall) ----
                "fc_map_g_km": _safe_float(raw.get("FC-Map [g/km]")),
                "fc_ncvc_g_km": _safe_float(raw.get("FC-NCVc [g/km]")),
                "fc_whtcc_g_km": _safe_float(raw.get("FC-WHTCc [g/km]")),
                "fc_ess_g_km": _safe_float(raw.get("FC-ESS [g/km]")),
                "fc_ess_corr_g_km": _safe_float(raw.get("FC-ESS_Corr [g/km]")),
                "fc_busaux_ps_corr_g_km": _safe_float(raw.get("FC-BusAux_PS_Corr [g/km]")),
                "fc_busaux_es_corr_g_km": _safe_float(raw.get("FC-BusAux_ES_Corr [g/km]")),
                "fc_busaux_auxheater_g_km": _safe_float(raw.get("FC-BusAux_AuxHeater [g/km]")),
                "fc_busaux_auxheater_corr_g_km": _safe_float(raw.get("FC-BusAux_AuxHeater_Corr [g/km]")),
                "fc_final_g_km": _safe_float(raw.get("FC-Final [g/km]")),
                "fc_final_l_100km": _safe_float(raw.get("FC-Final [l/100km]")),
                "fc_final_l_100pkm": _safe_float(raw.get("FC-Final [l/100Pkm]")),
                "specific_fc_g_kwh": _safe_float(raw.get("Specific FC [g/kWh] wheel pos.")),

                # ---- CO2 ----
                "co2_g_km": _safe_float(raw.get("CO2 [g/km]")),
                "co2_g_pkm": _safe_float(raw.get("CO2 [g/Pkm]")),

                # ---- Energy Breakdown (Sankey) ----
                "E_fcmap_pos": _safe_float(raw.get("E_fcmap_pos [kWh]")),
                "E_fcmap_neg": _safe_float(raw.get("E_fcmap_neg [kWh]")),
                "E_powertrain_inertia": _safe_float(raw.get("E_powertrain_inertia [kWh]")),
                "E_aux_FAN": _safe_float(raw.get("E_aux_FAN [kWh]")),
                "E_aux_STP": _safe_float(raw.get("E_aux_STP [kWh]")),
                "E_aux_sum": _safe_float(raw.get("E_aux_sum [kWh]")),
                "E_tc_loss": _safe_float(raw.get("E_tc_loss [kWh]")),
                "E_shift_loss": _safe_float(raw.get("E_shift_loss [kWh]")),
                "E_gbx_loss": _safe_float(raw.get("E_gbx_loss [kWh]")),
                "E_axl_loss": _safe_float(raw.get("E_axl_loss [kWh]")),
                "E_wheelEnd_saved": _safe_float(raw.get("E_wheelEnd_saved [kWh]")),
                "E_brake": _safe_float(raw.get("E_brake [kWh]")),
                "E_vehi_inertia": _safe_float(raw.get("E_vehi_inertia [kWh]")),
                "E_air": _safe_float(raw.get("E_air [kWh]")),
                "E_roll": _safe_float(raw.get("E_roll [kWh]")),
                "E_grad": _safe_float(raw.get("E_grad [kWh]")),

                # ---- Bus Auxiliary Energy ----
                "busaux_ps_air_consumed": _safe_float(raw.get("BusAux PS air consumed [Nl]")),
                "busaux_ps_air_generated": _safe_float(raw.get("BusAux PS air generated [Nl]")),
                "E_PS_compressorOff": _safe_float(raw.get("E_PS_compressorOff [kWh]")),
                "E_PS_compressorOn": _safe_float(raw.get("E_PS_compressorOn [kWh]")),
                "E_BusAux_ES_consumed": _safe_float(raw.get("E_BusAux_ES_consumed [kWh]")),
                "E_BusAux_ES_generated": _safe_float(raw.get("E_BusAux_ES_generated [kWh]")),
                "dE_BusAux_Bat": _safe_float(raw.get("ΔE_BusAux_Bat [kWh]")),
                "E_BusAux_PS_corr": _safe_float(raw.get("E_BusAux_PS_corr [kWh]")),
                "E_BusAux_HVAC_mech": _safe_float(raw.get("E_BusAux_HVAC_mech [kWh]")),
                "E_BusAux_HVAC_el": _safe_float(raw.get("E_BusAux_HVAC_el [kWh]")),
                "E_BusAux_AuxHeater": _safe_float(raw.get("E_BusAux_AuxHeater [kWh]")),
                "E_ice_start": _safe_float(raw.get("E_ice_start [kWh]")),
                "ice_starts": _safe_float(raw.get("ice_starts [-]")),

                # ---- Driving Dynamics ----
                "AccelerationTimeShare": _safe_float(raw.get("AccelerationTimeShare [%]")),
                "DecelerationTimeShare": _safe_float(raw.get("DecelerationTimeShare [%]")),
                "CruiseTimeShare": _safe_float(raw.get("CruiseTimeShare [%]")),
                "StopTimeShare": _safe_float(raw.get("StopTimeShare [%]")),
                "CoastingTimeShare": _safe_float(raw.get("CoastingTimeShare [%]")),
                "BrakingTimeShare": _safe_float(raw.get("BrakingTimeShare [%]")),
                "ICE_max_load_ts": _safe_float(raw.get("ICE max. Load time share [%]")),
                "ICE_off_ts": _safe_float(raw.get("ICE off time share [%]")),
                "max_speed_kmh": _safe_float(raw.get("max. speed [km/h]")),
                "max_acc": _safe_float(raw.get("max. acc [m/s²]")),
                "max_dec": _safe_float(raw.get("max. dec [m/s²]")),
                "n_eng_avg": _safe_float(raw.get("n_eng_avg [rpm]")),
                "n_eng_max": _safe_float(raw.get("n_eng_max [rpm]")),
                "gear_shifts": _safe_float(raw.get("gear shifts [-]")),

                # ---- Component Efficiency ----
                "avg_engine_efficiency": _safe_float(raw.get("Average engine efficiency [-]")),
                "avg_tc_efficiency_no_lockup": _safe_float(raw.get("Average torque converter efficiency w/o lockup [-]")),
                "avg_tc_efficiency_lockup": _safe_float(raw.get("Average torque converter efficiency with lockup [-]")),
                "avg_gearbox_efficiency": _safe_float(raw.get("Average gearbox efficiency [-]")),
                "avg_axlegear_efficiency": _safe_float(raw.get("Average axlegear efficiency [-]")),

                # ---- Gear TimeShare ----
                "gear_0_ts": _safe_float(raw.get("Gear 0 TimeShare [%]")),
                "gear_1_ts": _safe_float(raw.get("Gear 1 TimeShare [%]")),
                "gear_2_ts": _safe_float(raw.get("Gear 2 TimeShare [%]")),
                "gear_3_ts": _safe_float(raw.get("Gear 3 TimeShare [%]")),
                "gear_4_ts": _safe_float(raw.get("Gear 4 TimeShare [%]")),
                "gear_5_ts": _safe_float(raw.get("Gear 5 TimeShare [%]")),
                "gear_6_ts": _safe_float(raw.get("Gear 6 TimeShare [%]")),

                # ---- Power ----
                "P_wheel_in": _safe_float(raw.get("P_wheel_in [kW]")),
                "P_wheel_in_pos": _safe_float(raw.get("P_wheel_in_pos [kW]")),
                "P_fcmap": _safe_float(raw.get("P_fcmap [kW]")),
                "P_fcmap_pos": _safe_float(raw.get("P_fcmap_pos [kW]")),
            }

            # Infer loading label
            curb = row["curb_mass_kg"] or 0
            total = row["total_mass_kg"] or 0
            if curb > 0 and total > 0:
                ratio = (total - curb) / curb
                row["loading"] = "Reference" if ratio > 0.2 else "Low"
            else:
                row["loading"] = "Unknown"

            rows.append(row)

    return rows


@router.get("/full-data")
async def get_full_vsum_data():
    """Return all parsed .vsum data rows for all variants/missions."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No .vsum files found in Output Files directory")

    # Group by file (variant)
    variants = {}
    for r in rows:
        key = r["file"]
        if key not in variants:
            variants[key] = {
                "file": key,
                "vin": r["vin"],
                "vehicle_model": r["vehicle_model"],
                "vehicle_group": r["vehicle_group"],
                "engine_model": r["engine_model"],
                "engine_power_kw": r["engine_power_kw"],
                "missions": [],
            }
        variants[key]["missions"].append(r)

    return {
        "total_files": len(variants),
        "total_runs": len(rows),
        "variants": list(variants.values()),
        "missions_available": sorted(set(r["mission"] for r in rows)),
    }


@router.get("/energy-sankey")
async def get_energy_sankey():
    """Energy flow breakdown per mission — for Sankey diagrams."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    # Aggregate by mission + loading
    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    result = []
    for key, g in groups.items():
        n = len(g["rows"])
        energy_fields = [
            "E_fcmap_pos", "E_air", "E_roll", "E_grad", "E_brake",
            "E_vehi_inertia", "E_aux_sum", "E_aux_FAN", "E_aux_STP",
            "E_tc_loss", "E_shift_loss", "E_gbx_loss", "E_axl_loss",
            "E_powertrain_inertia", "E_wheelEnd_saved",
            "E_BusAux_HVAC_mech", "E_BusAux_HVAC_el", "E_BusAux_AuxHeater",
            "E_BusAux_ES_consumed", "E_PS_compressorOn",
        ]
        avg = {}
        for f in energy_fields:
            vals = [r[f] for r in g["rows"] if r.get(f) is not None]
            avg[f] = round(sum(vals) / len(vals), 4) if vals else 0

        result.append({
            "mission": g["mission"],
            "loading": g["loading"],
            "count": n,
            "energy": avg,
        })

    return {"sankey_data": sorted(result, key=lambda x: x["mission"])}


@router.get("/driving-dynamics")
async def get_driving_dynamics():
    """Driving dynamics profiles per mission."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    fields = [
        "AccelerationTimeShare", "DecelerationTimeShare", "CruiseTimeShare",
        "StopTimeShare", "CoastingTimeShare", "BrakingTimeShare",
        "avg_speed_kmh", "max_speed_kmh", "n_eng_avg", "n_eng_max",
        "max_acc", "max_dec", "gear_shifts", "ICE_max_load_ts", "ICE_off_ts",
    ]
    result = []
    for g in groups.values():
        n = len(g["rows"])
        avg = {}
        for f in fields:
            vals = [r[f] for r in g["rows"] if r.get(f) is not None]
            avg[f] = round(sum(vals) / len(vals), 2) if vals else 0
        result.append({
            "mission": g["mission"], "loading": g["loading"], "count": n, **avg,
        })

    return {"dynamics": sorted(result, key=lambda x: x["mission"])}


@router.get("/gear-usage")
async def get_gear_usage():
    """Gear time-share heatmap per mission."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    result = []
    for g in groups.values():
        n = len(g["rows"])
        gears = {}
        for i in range(7):
            vals = [r[f"gear_{i}_ts"] for r in g["rows"] if r.get(f"gear_{i}_ts") is not None]
            gears[f"gear_{i}"] = round(sum(vals) / len(vals), 2) if vals else 0
        result.append({
            "mission": g["mission"], "loading": g["loading"], "count": n, **gears,
        })

    return {"gear_usage": sorted(result, key=lambda x: x["mission"])}


@router.get("/drivetrain-losses")
async def get_drivetrain_losses():
    """Drivetrain component losses per mission."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    loss_fields = ["E_tc_loss", "E_shift_loss", "E_gbx_loss", "E_axl_loss"]
    result = []
    for g in groups.values():
        n = len(g["rows"])
        losses = {}
        for f in loss_fields:
            vals = [r[f] for r in g["rows"] if r.get(f) is not None]
            losses[f] = round(sum(vals) / len(vals), 4) if vals else 0
        total = sum(losses.values())
        losses["total_loss"] = round(total, 4)
        result.append({
            "mission": g["mission"], "loading": g["loading"], "count": n, **losses,
        })

    return {"losses": sorted(result, key=lambda x: x["mission"])}


@router.get("/bus-auxiliary")
async def get_bus_auxiliary():
    """Bus auxiliary energy consumption breakdown."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    aux_fields = [
        "E_aux_FAN", "E_aux_STP", "E_BusAux_HVAC_mech", "E_BusAux_HVAC_el",
        "E_BusAux_AuxHeater", "E_BusAux_ES_consumed", "E_PS_compressorOn",
        "E_ice_start", "E_aux_sum",
    ]
    result = []
    for g in groups.values():
        n = len(g["rows"])
        aux = {}
        for f in aux_fields:
            vals = [r[f] for r in g["rows"] if r.get(f) is not None]
            aux[f] = round(sum(vals) / len(vals), 4) if vals else 0
        result.append({
            "mission": g["mission"], "loading": g["loading"], "count": n, **aux,
        })

    return {"auxiliary": sorted(result, key=lambda x: x["mission"])}


@router.get("/fc-waterfall")
async def get_fc_waterfall():
    """FC correction chain waterfall per mission."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    fc_fields = [
        "fc_map_g_km", "fc_ncvc_g_km", "fc_whtcc_g_km",
        "fc_ess_g_km", "fc_ess_corr_g_km",
        "fc_busaux_ps_corr_g_km", "fc_busaux_es_corr_g_km",
        "fc_busaux_auxheater_corr_g_km", "fc_final_g_km",
    ]
    result = []
    for g in groups.values():
        n = len(g["rows"])
        fc = {}
        for f in fc_fields:
            vals = [r[f] for r in g["rows"] if r.get(f) is not None]
            fc[f] = round(sum(vals) / len(vals), 2) if vals else 0
        result.append({
            "mission": g["mission"], "loading": g["loading"], "count": n, **fc,
        })

    return {"waterfall": sorted(result, key=lambda x: x["mission"])}


@router.get("/loading-sensitivity")
async def get_loading_sensitivity():
    """CO2/FC comparison between Low and Reference loading per mission/variant."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['file']}|{r['mission']}"
        if key not in groups:
            groups[key] = {"file": r["file"], "vehicle_model": r["vehicle_model"], "mission": r["mission"], "low": None, "ref": None}
        if r["loading"] == "Low":
            groups[key]["low"] = r
        else:
            groups[key]["ref"] = r

    result = []
    for g in groups.values():
        if g["low"] and g["ref"]:
            result.append({
                "file": g["file"],
                "vehicle_model": g["vehicle_model"],
                "mission": g["mission"],
                "low_pax": g["low"].get("passenger_count"),
                "ref_pax": g["ref"].get("passenger_count"),
                "low_co2_g_km": g["low"].get("co2_g_km"),
                "ref_co2_g_km": g["ref"].get("co2_g_km"),
                "low_co2_g_pkm": g["low"].get("co2_g_pkm"),
                "ref_co2_g_pkm": g["ref"].get("co2_g_pkm"),
                "low_fc_l_100km": g["low"].get("fc_final_l_100km"),
                "ref_fc_l_100km": g["ref"].get("fc_final_l_100km"),
                "co2_increase_pct": round(
                    ((g["ref"]["co2_g_km"] - g["low"]["co2_g_km"]) / g["low"]["co2_g_km"]) * 100, 1
                ) if g["low"].get("co2_g_km") and g["ref"].get("co2_g_km") and g["low"]["co2_g_km"] > 0 else None,
                "low_mass_kg": g["low"].get("total_mass_kg"),
                "ref_mass_kg": g["ref"].get("total_mass_kg"),
            })

    return {"sensitivity": sorted(result, key=lambda x: x["mission"])}


@router.get("/component-efficiency")
async def get_component_efficiency():
    """Component efficiency per mission (engine, gearbox, TC, axle)."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    groups = {}
    for r in rows:
        key = f"{r['mission']}|{r['loading']}"
        if key not in groups:
            groups[key] = {"mission": r["mission"], "loading": r["loading"], "rows": []}
        groups[key]["rows"].append(r)

    eff_fields = [
        "avg_engine_efficiency", "avg_gearbox_efficiency",
        "avg_tc_efficiency_no_lockup", "avg_tc_efficiency_lockup",
        "avg_axlegear_efficiency",
    ]
    result = []
    for g in groups.values():
        n = len(g["rows"])
        eff = {}
        for f in eff_fields:
            vals = [r[f] for r in g["rows"] if r.get(f) is not None]
            eff[f] = round(sum(vals) / len(vals), 6) if vals else 0
        result.append({
            "mission": g["mission"], "loading": g["loading"], "count": n, **eff,
        })

    return {"efficiency": sorted(result, key=lambda x: x["mission"])}


@router.get("/engine-operating-point")
async def get_engine_operating_point():
    """Engine operating point data (avg RPM, load, specific FC) per mission."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    result = []
    for r in rows:
        if r.get("n_eng_avg") and r.get("specific_fc_g_kwh"):
            result.append({
                "file": r["file"],
                "vehicle_model": r["vehicle_model"],
                "mission": r["mission"],
                "loading": r["loading"],
                "n_eng_avg": r["n_eng_avg"],
                "n_eng_max": r["n_eng_max"],
                "engine_idle_rpm": r["engine_idle_rpm"],
                "engine_rated_rpm": r["engine_rated_rpm"],
                "specific_fc_g_kwh": r["specific_fc_g_kwh"],
                "P_fcmap_pos": r["P_fcmap_pos"],
                "E_fcmap_pos": r["E_fcmap_pos"],
                "avg_engine_efficiency": r.get("avg_engine_efficiency"),
                "engine_power_kw": r["engine_power_kw"],
                "co2_g_km": r["co2_g_km"],
            })

    return {"operating_points": sorted(result, key=lambda x: (x["file"], x["mission"]))}


@router.get("/adas-impact")
async def get_adas_impact():
    """ADAS technology breakdown and CO2 impact estimation per variant."""
    rows = _parse_all_vsum_files()
    if not rows:
        raise HTTPException(status_code=404, detail="No data")

    # Group by file (variant)
    variants = {}
    for r in rows:
        key = r["file"]
        if key not in variants:
            variants[key] = {
                "file": key,
                "vehicle_model": r["vehicle_model"],
                "adas_tech": r["adas_tech"],
                "shift_strategy": r["shift_strategy"],
                "aux_tech_fan": r["aux_tech_fan"],
                "aux_tech_ac": r["aux_tech_ac"],
                "aux_tech_ps": r["aux_tech_ps"],
                "aux_tech_es": r["aux_tech_es"],
                "missions": {},
            }
        variants[key]["missions"][f"{r['mission']}|{r['loading']}"] = {
            "mission": r["mission"],
            "loading": r["loading"],
            "co2_g_km": r["co2_g_km"],
            "fc_final_g_km": r["fc_final_g_km"],
            "ICE_off_ts": r.get("ICE_off_ts"),
            "ice_starts": r.get("ice_starts"),
            "CoastingTimeShare": r.get("CoastingTimeShare"),
        }

    result = []
    for v in variants.values():
        v["missions"] = list(v["missions"].values())
        result.append(v)

    return {"adas_data": sorted(result, key=lambda x: x["file"])}
