"""
CO2 Emissions, Fleet Tracking, Correlation & Benchmark API.

Architecture:
  - CO2 data comes from VECTO result files (RSLT_CUSTOMER/MANUFACTURER XML)
  - We do NOT calculate CO2 ourselves
  - Fleet tracking: variant count × variant CO2 = fleet CO2
  - Correlation: VECTO results vs real test data from test team
  - Benchmark: configure variants and compare CO2/FC
"""
import os
import glob
import logging
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Body
from sqlalchemy import select, func, update, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import (
    Vehicle, VehicleVariant, VectoResultCertified, RealTestResult,
    Fleet, FleetItem,
)
from sqlalchemy import delete as sa_delete
from app.services.vecto_result_parser import parse_customer_result_xml, parse_manufacturer_output_xml

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/co2", tags=["CO2 & Fleet"])


# ═══════════════════════════════════════════════════════════
# VECTO Result Import — THE source of CO2 data
# ═══════════════════════════════════════════════════════════

@router.post("/import-result")
async def import_vecto_result_file(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a single VECTO result XML (RSLT_CUSTOMER or RSLT_MANUFACTURER).
    This creates the official CO2 records for the variant.
    """
    import tempfile
    content = await file.read()
    suffix = ".xml"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        parsed = parse_customer_result_xml(tmp_path)
    finally:
        os.unlink(tmp_path)

    if "error" in parsed and not parsed.get("results"):
        raise HTTPException(400, f"Parse error: {parsed['error']}")

    veh = parsed.get("vehicle", {})
    results = parsed.get("results", [])
    summary = parsed.get("summary", {})
    sim_info = parsed.get("simulation_info", {})

    if not results:
        raise HTTPException(400, "No successful results found in file")

    # Try to match variant by VIN or model+power
    variant_id = await _match_variant(db, veh)

    imported = 0
    for r in results:
        rec = VectoResultCertified(
            variant_id=variant_id,
            vin=veh.get("vin", "UNKNOWN"),
            vehicle_model=veh.get("model"),
            vehicle_category=veh.get("vehicle_category"),
            vehicle_group=veh.get("vehicle_group"),
            vehicle_group_co2=veh.get("vehicle_group_co2"),
            class_bus=veh.get("class_bus"),
            axle_configuration=veh.get("axle_configuration"),
            corrected_actual_mass_kg=veh.get("corrected_actual_mass_kg"),
            tech_max_laden_mass_kg=veh.get("tech_max_laden_mass_kg"),
            total_propulsion_power_kw=veh.get("total_propulsion_power_kw"),
            total_passengers=int(veh["total_passengers"]) if veh.get("total_passengers") else None,
            mission=r.get("mission", "Unknown"),
            loading=r.get("loading", "Unknown"),
            total_vehicle_mass_kg=r.get("total_vehicle_mass_kg"),
            mass_passengers_kg=r.get("mass_passengers_kg"),
            passenger_count=r.get("passenger_count"),
            avg_speed_kmh=r.get("avg_speed_kmh"),
            co2_g_per_km=r.get("co2_g_per_km"),
            co2_g_per_pkm=r.get("co2_g_per_pkm"),
            fc_g_per_km=r.get("fc_g_per_km"),
            fc_g_per_pkm=r.get("fc_g_per_pkm"),
            fc_mj_per_km=r.get("fc_mj_per_km"),
            fc_mj_per_pkm=r.get("fc_mj_per_pkm"),
            fc_l_per_100km=r.get("fc_l_per_100km"),
            fc_l_per_pkm=r.get("fc_l_per_pkm"),
            engine_rated_power_kw=veh.get("engine_rated_power_kw"),
            engine_capacity_ltr=veh.get("engine_capacity_ltr"),
            fuel_type=veh.get("fuel_type"),
            transmission_type=veh.get("transmission_type"),
            nr_of_gears=int(veh["nr_of_gears"]) if veh.get("nr_of_gears") else None,
            retarder=veh.get("retarder"),
            axle_ratio=float(veh["axle_ratio"]) if veh.get("axle_ratio") else None,
            average_rrc=float(veh["average_rrc"]) if veh.get("average_rrc") else None,
            tyre_dimension=veh.get("tyre_dimension"),
            hvac_config=veh.get("hvac_config"),
            double_glazing=veh.get("double_glazing"),
            engine_stop_start=veh.get("engine_stop_start", False),
            eco_roll=veh.get("eco_roll", False),
            predictive_cruise_control=veh.get("predictive_cruise_control", False),
            source_file=file.filename,
            source_type=parsed.get("source_type", "RSLT_CUSTOMER"),
            simulation_tool_version=sim_info.get("tool_version"),
            simulation_date=sim_info.get("date_parsed"),
            status="success",
        )
        db.add(rec)
        imported += 1

    # Also add summary row if available
    if summary.get("co2_g_per_km"):
        sum_rec = VectoResultCertified(
            variant_id=variant_id,
            vin=veh.get("vin", "UNKNOWN"),
            vehicle_model=veh.get("model"),
            vehicle_category=veh.get("vehicle_category"),
            vehicle_group=veh.get("vehicle_group"),
            vehicle_group_co2=veh.get("vehicle_group_co2"),
            corrected_actual_mass_kg=veh.get("corrected_actual_mass_kg"),
            tech_max_laden_mass_kg=veh.get("tech_max_laden_mass_kg"),
            total_propulsion_power_kw=veh.get("total_propulsion_power_kw"),
            total_passengers=int(veh["total_passengers"]) if veh.get("total_passengers") else None,
            mission="Summary",
            loading="WeightedAvg",
            is_summary=True,
            co2_g_per_km=summary.get("co2_g_per_km"),
            co2_g_per_pkm=summary.get("co2_g_per_pkm"),
            fc_l_per_100km=summary.get("fc_l_per_100km"),
            summary_co2_g_per_km=summary.get("co2_g_per_km"),
            summary_co2_g_per_pkm=summary.get("co2_g_per_pkm"),
            summary_fc_l_per_100km=summary.get("fc_l_per_100km"),
            summary_avg_passenger_count=summary.get("avg_passenger_count"),
            engine_rated_power_kw=veh.get("engine_rated_power_kw"),
            fuel_type=veh.get("fuel_type"),
            source_file=file.filename,
            source_type=parsed.get("source_type", "RSLT_CUSTOMER"),
            simulation_tool_version=sim_info.get("tool_version"),
            simulation_date=sim_info.get("date_parsed"),
            status="success",
        )
        db.add(sum_rec)

    await db.commit()

    return {
        "status": "success",
        "vin": veh.get("vin"),
        "model": veh.get("model"),
        "variant_matched": variant_id is not None,
        "variant_id": str(variant_id) if variant_id else None,
        "results_imported": imported,
        "has_summary": bool(summary.get("co2_g_per_km")),
        "summary_co2": summary.get("co2_g_per_km"),
        "missions": [r.get("mission") for r in results],
    }


@router.post("/import-result-directory")
async def import_result_directory(
    directory: str = Query(..., description="Path to folder with RSLT_CUSTOMER/MANUFACTURER XMLs"),
    db: AsyncSession = Depends(get_db),
):
    """Import all VECTO result XMLs from a directory."""
    if not os.path.isdir(directory):
        raise HTTPException(400, f"Directory not found: {directory}")

    xml_files = (
        glob.glob(os.path.join(directory, "**", "*RSLT_CUSTOMER*.xml"), recursive=True) +
        glob.glob(os.path.join(directory, "**", "*RSLT_MANUFACTURER*.xml"), recursive=True)
    )

    imported_total = 0
    results_list = []
    errors = []

    for filepath in xml_files:
        try:
            parsed = parse_customer_result_xml(filepath)
            if "error" in parsed and not parsed.get("results"):
                errors.append({"file": filepath, "error": parsed["error"]})
                continue

            veh = parsed.get("vehicle", {})
            sim_info = parsed.get("simulation_info", {})
            summary = parsed.get("summary", {})
            variant_id = await _match_variant(db, veh)

            count = 0
            for r in parsed.get("results", []):
                rec = VectoResultCertified(
                    variant_id=variant_id,
                    vin=veh.get("vin", "UNKNOWN"),
                    vehicle_model=veh.get("model"),
                    vehicle_category=veh.get("vehicle_category"),
                    vehicle_group=veh.get("vehicle_group"),
                    vehicle_group_co2=veh.get("vehicle_group_co2"),
                    class_bus=veh.get("class_bus"),
                    axle_configuration=veh.get("axle_configuration"),
                    corrected_actual_mass_kg=veh.get("corrected_actual_mass_kg"),
                    tech_max_laden_mass_kg=veh.get("tech_max_laden_mass_kg"),
                    total_propulsion_power_kw=veh.get("total_propulsion_power_kw"),
                    total_passengers=int(veh["total_passengers"]) if veh.get("total_passengers") else None,
                    mission=r.get("mission", "Unknown"),
                    loading=r.get("loading", "Unknown"),
                    total_vehicle_mass_kg=r.get("total_vehicle_mass_kg"),
                    mass_passengers_kg=r.get("mass_passengers_kg"),
                    passenger_count=r.get("passenger_count"),
                    avg_speed_kmh=r.get("avg_speed_kmh"),
                    co2_g_per_km=r.get("co2_g_per_km"),
                    co2_g_per_pkm=r.get("co2_g_per_pkm"),
                    fc_g_per_km=r.get("fc_g_per_km"),
                    fc_g_per_pkm=r.get("fc_g_per_pkm"),
                    fc_mj_per_km=r.get("fc_mj_per_km"),
                    fc_mj_per_pkm=r.get("fc_mj_per_pkm"),
                    fc_l_per_100km=r.get("fc_l_per_100km"),
                    fc_l_per_pkm=r.get("fc_l_per_pkm"),
                    engine_rated_power_kw=veh.get("engine_rated_power_kw"),
                    fuel_type=veh.get("fuel_type"),
                    transmission_type=veh.get("transmission_type"),
                    axle_ratio=float(veh["axle_ratio"]) if veh.get("axle_ratio") else None,
                    average_rrc=float(veh["average_rrc"]) if veh.get("average_rrc") else None,
                    source_file=filepath,
                    source_type=parsed.get("source_type"),
                    simulation_tool_version=sim_info.get("tool_version"),
                    simulation_date=sim_info.get("date_parsed"),
                    status="success",
                )
                db.add(rec)
                count += 1

            # Summary
            if summary.get("co2_g_per_km"):
                db.add(VectoResultCertified(
                    variant_id=variant_id,
                    vin=veh.get("vin", "UNKNOWN"),
                    vehicle_model=veh.get("model"),
                    mission="Summary", loading="WeightedAvg", is_summary=True,
                    co2_g_per_km=summary.get("co2_g_per_km"),
                    co2_g_per_pkm=summary.get("co2_g_per_pkm"),
                    fc_l_per_100km=summary.get("fc_l_per_100km"),
                    summary_co2_g_per_km=summary.get("co2_g_per_km"),
                    summary_co2_g_per_pkm=summary.get("co2_g_per_pkm"),
                    summary_fc_l_per_100km=summary.get("fc_l_per_100km"),
                    summary_avg_passenger_count=summary.get("avg_passenger_count"),
                    source_file=filepath,
                    source_type=parsed.get("source_type"),
                    simulation_tool_version=sim_info.get("tool_version"),
                    status="success",
                ))

            imported_total += count
            results_list.append({
                "file": os.path.basename(filepath),
                "vin": veh.get("vin"),
                "model": veh.get("model"),
                "results": count,
                "summary_co2": summary.get("co2_g_per_km"),
            })
        except Exception as e:
            errors.append({"file": filepath, "error": str(e)})
            logger.error(f"Failed: {filepath}: {e}")

    await db.commit()

    return {
        "files_processed": len(xml_files),
        "results_imported": imported_total,
        "files": results_list,
        "errors": errors,
    }


# ═══════════════════════════════════════════════════════════
# CO2 Dashboard — All data from VECTO result files
# ═══════════════════════════════════════════════════════════

@router.get("/fleet-emissions")
async def get_fleet_emissions(db: AsyncSession = Depends(get_db)):
    """
    Fleet CO2 dashboard — data from VECTO result files ONLY.
    Groups by VIN/model, shows per-mission CO2 and fleet-weighted totals.
    """
    # Get all certified results (excluding summaries for detail view)
    result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.is_summary == False)
        .order_by(VectoResultCertified.vin, VectoResultCertified.mission)
    )
    all_results = result.scalars().all()

    # Get summaries separately
    sum_result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.is_summary == True)
    )
    summaries = {s.vin: s for s in sum_result.scalars().all()}

    # Get fleet counts from variants
    var_result = await db.execute(
        select(VehicleVariant.variant_code, VehicleVariant.fleet_count,
               Vehicle.model_name, Vehicle.category)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    variant_fleet = {r.variant_code: {
        "fleet_count": r.fleet_count or 0,
        "model_name": r.model_name,
        "category": str(r.category),
    } for r in var_result.all()}

    # Group results by VIN
    by_vin = {}
    for r in all_results:
        vin = r.vin
        if vin not in by_vin:
            s = summaries.get(vin)
            by_vin[vin] = {
                "vin": vin,
                "model": r.vehicle_model,
                "vehicle_group": r.vehicle_group,
                "vehicle_group_co2": r.vehicle_group_co2,
                "class_bus": r.class_bus,
                "power_kw": float(r.total_propulsion_power_kw) if r.total_propulsion_power_kw else (float(r.engine_rated_power_kw) if r.engine_rated_power_kw else None),
                "corrected_mass_kg": float(r.corrected_actual_mass_kg) if r.corrected_actual_mass_kg else None,
                "max_laden_mass_kg": float(r.tech_max_laden_mass_kg) if r.tech_max_laden_mass_kg else None,
                "total_passengers": r.total_passengers,
                "fuel_type": r.fuel_type,
                "transmission_type": r.transmission_type,
                "axle_ratio": float(r.axle_ratio) if r.axle_ratio else None,
                "summary_co2": float(s.co2_g_per_km) if s else None,
                "summary_fc_l_100km": float(s.fc_l_per_100km) if s and s.fc_l_per_100km else None,
                "summary_co2_pkm": float(s.co2_g_per_pkm) if s and s.co2_g_per_pkm else None,
                "missions": [],
                "variant_id": str(r.variant_id) if r.variant_id else None,
                "fleet_count": 0,
            }
        by_vin[vin]["missions"].append({
            "mission": r.mission,
            "loading": r.loading,
            "primary_subgroup": r.primary_subgroup,
            "status": r.status or "success",
            "fuel_type": r.fuel_type,
            "co2_g_km": float(r.co2_g_per_km) if r.co2_g_per_km else None,
            "co2_g_pkm": float(r.co2_g_per_pkm) if r.co2_g_per_pkm else None,
            "fc_l_100km": float(r.fc_l_per_100km) if r.fc_l_per_100km else None,
            "fc_l_pkm": float(r.fc_l_per_pkm) if r.fc_l_per_pkm else None,
            "fc_g_km": float(r.fc_g_per_km) if r.fc_g_per_km else None,
            "fc_g_pkm": float(r.fc_g_per_pkm) if r.fc_g_per_pkm else None,
            "fc_mj_km": float(r.fc_mj_per_km) if r.fc_mj_per_km else None,
            "fc_mj_pkm": float(r.fc_mj_per_pkm) if r.fc_mj_per_pkm else None,
            "energy_mj_km": float(r.energy_mj_per_km) if r.energy_mj_per_km else None,
            "avg_speed": float(r.avg_speed_kmh) if r.avg_speed_kmh else None,
            "passengers": float(r.passenger_count) if r.passenger_count else None,
            "mass_passengers_kg": float(r.mass_passengers_kg) if r.mass_passengers_kg else None,
            "total_mass_kg": float(r.total_vehicle_mass_kg) if r.total_vehicle_mass_kg else None,
            "distance_km": float(r.distance_km) if r.distance_km else None,
            "payload_kg": float(r.payload_kg) if r.payload_kg else None,
        })

    vehicles = list(by_vin.values())

    # For vehicles without explicit summary, compute avg from missions
    for v in vehicles:
        if v["summary_co2"] is None:
            co2_vals = [m["co2_g_km"] for m in v["missions"] if m["co2_g_km"]]
            pkm_vals = [m["co2_g_pkm"] for m in v["missions"] if m["co2_g_pkm"]]
            fc_vals = [m["fc_l_100km"] for m in v["missions"] if m["fc_l_100km"]]
            if co2_vals:
                v["summary_co2"] = round(sum(co2_vals) / len(co2_vals), 1)
            if pkm_vals:
                v["summary_co2_pkm"] = round(sum(pkm_vals) / len(pkm_vals), 2)
            if fc_vals:
                v["summary_fc_l_100km"] = round(sum(fc_vals) / len(fc_vals), 2)

    # Assign fleet counts from variant_fleet map
    for v in vehicles:
        vin = v["vin"]
        if vin in variant_fleet:
            v["fleet_count"] = variant_fleet[vin]["fleet_count"]

    # Compute stats from summary_co2 (now available for all vehicles)
    all_summary_co2 = [v["summary_co2"] for v in vehicles if v["summary_co2"]]

    # Model aggregation — normalize model names (case-insensitive)
    by_model = {}
    for v in vehicles:
        model = v["model"] or "Unknown"
        model_key = model.upper()
        if model_key not in by_model:
            by_model[model_key] = {"model": model.upper(), "vehicles": [], "co2_values": []}
        by_model[model_key]["vehicles"].append(v)
        if v["summary_co2"]:
            by_model[model_key]["co2_values"].append(v["summary_co2"])

    model_summary = []
    for mn, mg in by_model.items():
        vals = mg["co2_values"]
        model_summary.append({
            "model": mn,
            "vehicle_count": len(mg["vehicles"]),
            "co2_avg": round(sum(vals) / len(vals), 1) if vals else None,
            "co2_min": round(min(vals), 1) if vals else None,
            "co2_max": round(max(vals), 1) if vals else None,
            "co2_spread": round(max(vals) - min(vals), 1) if len(vals) > 1 else 0,
        })
    model_summary.sort(key=lambda x: x["co2_avg"] or 9999)

    fleet_summary = {
        "total_vehicles": len(vehicles),
        "total_results": len(all_results),
        "co2_avg": round(sum(all_summary_co2) / len(all_summary_co2), 1) if all_summary_co2 else None,
        "co2_min": round(min(all_summary_co2), 1) if all_summary_co2 else None,
        "co2_max": round(max(all_summary_co2), 1) if all_summary_co2 else None,
        "best_vehicle": min(vehicles, key=lambda x: x["summary_co2"] or 9999) if vehicles else None,
        "worst_vehicle": max(vehicles, key=lambda x: x["summary_co2"] or 0) if vehicles else None,
    }

    return {
        "fleet_summary": fleet_summary,
        "model_summary": model_summary,
        "vehicles": vehicles,
    }


# ═══════════════════════════════════════════════════════════
# Digital Twin — Master view combining input + output data
# ═══════════════════════════════════════════════════════════

@router.get("/digital-twin/{variant_code}")
async def get_digital_twin(variant_code: str, db: AsyncSession = Depends(get_db)):
    """
    Master Digital Twin for a bus variant.
    Combines input specs (variant XML), output results (RSLT_MANUFACTURER),
    and fleet position into one comprehensive view.
    """
    from app.models import FuelConsumptionMap, FullLoadDragCurve, GearRatio

    # 1) Find input variant by variant_code
    var_result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .where(VehicleVariant.variant_code == variant_code)
    )
    var_row = var_result.first()

    input_specs = None
    variant_id = None
    if var_row:
        v, veh = var_row
        variant_id = v.id
        input_specs = {
            "variant_id": str(v.id),
            "variant_code": v.variant_code,
            "vehicle_model": veh.model_name,
            "manufacturer": veh.manufacturer,
            "category": str(veh.category),
            "chassis_config": veh.chassis_config,
            "axle_config": veh.axle_config,
            "engine": {
                "manufacturer": v.engine_manufacturer,
                "model": v.engine_model,
                "cert_number": v.engine_cert_number,
                "type": v.engine_type,
                "displacement_cc": v.displacement_cc,
                "rated_speed_rpm": v.rated_speed_rpm,
                "rated_power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
                "rated_power_hp": round(v.rated_power_w / 745.7) if v.rated_power_w else None,
                "max_torque_nm": float(v.max_torque_nm) if v.max_torque_nm else None,
                "idling_speed_rpm": v.idling_speed_rpm,
                "fuel_type": v.fuel_type,
            },
            "gearbox": {
                "manufacturer": v.gearbox_manufacturer,
                "model": v.gearbox_model,
                "type": v.gearbox_type,
                "gear_count": v.gear_count,
            },
            "axle": {
                "ratio": float(v.axle_ratio) if v.axle_ratio else None,
                "type": v.axle_type,
            },
            "tyre": {
                "manufacturer": v.tyre_manufacturer,
                "model": v.tyre_model,
                "dimension": v.tyre_dimension,
            },
            "tyre_front": {
                "manufacturer": v.tyre_front_manufacturer,
                "model": v.tyre_front_model,
                "dimension": v.tyre_front_dimension,
                "rrc": float(v.tyre_front_rrc) if v.tyre_front_rrc else None,
                "fz_iso": float(v.tyre_front_fz_iso) if v.tyre_front_fz_iso else None,
                "twin_tyres": v.tyre_front_twin_tyres or False,
            },
            "tyre_rear": {
                "manufacturer": v.tyre_rear_manufacturer,
                "model": v.tyre_rear_model,
                "dimension": v.tyre_rear_dimension,
                "rrc": float(v.tyre_rear_rrc) if v.tyre_rear_rrc else None,
                "fz_iso": float(v.tyre_rear_fz_iso) if v.tyre_rear_fz_iso else None,
                "twin_tyres": v.tyre_rear_twin_tyres or False,
            },
            "adas": {
                "engine_stop_start": v.engine_stop_start or False,
                "eco_roll": v.eco_roll or False,
                "predictive_cruise": v.predictive_cruise,
            },
            "auxiliaries": {
                "fan_technology": v.fan_technology,
                "steering_pump_tech": v.steering_pump_tech,
                "alternator_tech": v.alternator_tech,
                "retarder_type": v.retarder_type,
            },
            "vehicle": {
                "max_laden_mass_kg": v.max_laden_mass_kg,
                "curb_weight_kg": v.curb_weight_kg,
                "zero_emission": v.zero_emission_vehicle or False,
            },
            "correction_factors": {
                "whtc_urban": float(v.whtc_urban) if v.whtc_urban else None,
                "whtc_rural": float(v.whtc_rural) if v.whtc_rural else None,
                "whtc_motorway": float(v.whtc_motorway) if v.whtc_motorway else None,
            },
            "fleet_count": v.fleet_count or 0,
        }

        # Data completeness counts
        fuel_count = await db.execute(
            select(func.count(FuelConsumptionMap.id))
            .where(FuelConsumptionMap.variant_id == v.id)
        )
        load_count = await db.execute(
            select(func.count(FullLoadDragCurve.id))
            .where(FullLoadDragCurve.variant_id == v.id)
        )
        gear_count = await db.execute(
            select(func.count(GearRatio.id))
            .where(GearRatio.variant_id == v.id)
        )
        input_specs["data_counts"] = {
            "fuel_map_points": fuel_count.scalar() or 0,
            "load_curve_points": load_count.scalar() or 0,
            "gear_ratios": gear_count.scalar() or 0,
        }

    # 2) Find output results by VIN = variant_code
    output_result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.vin == variant_code)
        .where(VectoResultCertified.is_summary == False)
        .order_by(VectoResultCertified.primary_subgroup, VectoResultCertified.mission)
    )
    output_recs = output_result.scalars().all()

    output_data = None
    if output_recs:
        r0 = output_recs[0]
        subgroups = {}
        all_co2 = []
        all_fc = []
        for r in output_recs:
            sg = r.primary_subgroup or "Unknown"
            if sg not in subgroups:
                subgroups[sg] = []
            co2 = float(r.co2_g_per_km) if r.co2_g_per_km else None
            fc = float(r.fc_l_per_100km) if r.fc_l_per_100km else None
            if co2: all_co2.append(co2)
            if fc: all_fc.append(fc)
            subgroups[sg].append({
                "mission": r.mission,
                "loading": r.loading,
                "co2_g_km": co2,
                "co2_g_pkm": float(r.co2_g_per_pkm) if r.co2_g_per_pkm else None,
                "fc_g_km": float(r.fc_g_per_km) if r.fc_g_per_km else None,
                "fc_l_100km": fc,
                "fc_mj_km": float(r.fc_mj_per_km) if r.fc_mj_per_km else None,
                "energy_mj_km": float(r.energy_mj_per_km) if r.energy_mj_per_km else None,
                "distance_km": float(r.distance_km) if r.distance_km else None,
                "passenger_count": float(r.passenger_count) if r.passenger_count else None,
                "total_mass_kg": float(r.total_vehicle_mass_kg) if r.total_vehicle_mass_kg else None,
                "payload_kg": float(r.payload_kg) if r.payload_kg else None,
                "avg_speed": float(r.avg_speed_kmh) if r.avg_speed_kmh else None,
                "gearbox_eff": float(r.gearbox_efficiency_pct) if r.gearbox_efficiency_pct else None,
                "axlegear_eff": float(r.axlegear_efficiency_pct) if r.axlegear_efficiency_pct else None,
                "gearshift_count": r.gearshift_count,
            })

        # Per-subgroup averages
        subgroup_summary = {}
        for sg, missions in subgroups.items():
            sg_co2 = [m["co2_g_km"] for m in missions if m["co2_g_km"]]
            sg_fc = [m["fc_l_100km"] for m in missions if m["fc_l_100km"]]
            subgroup_summary[sg] = {
                "missions": missions,
                "co2_avg": round(sum(sg_co2) / len(sg_co2), 1) if sg_co2 else None,
                "fc_avg": round(sum(sg_fc) / len(sg_fc), 2) if sg_fc else None,
                "result_count": len(missions),
            }

        output_data = {
            "vehicle_info": {
                "model": r0.vehicle_model,
                "vehicle_group": r0.vehicle_group,
                "vehicle_category": r0.vehicle_category,
                "axle_configuration": r0.axle_configuration,
                "tech_max_laden_mass_kg": float(r0.tech_max_laden_mass_kg) if r0.tech_max_laden_mass_kg else None,
                "engine_rated_power_kw": float(r0.engine_rated_power_kw) if r0.engine_rated_power_kw else None,
                "fuel_type": r0.fuel_type,
                "tool_version": r0.simulation_tool_version,
                "source_type": r0.source_type,
            },
            "subgroups": subgroup_summary,
            "summary": {
                "total_results": len(output_recs),
                "co2_avg": round(sum(all_co2) / len(all_co2), 1) if all_co2 else None,
                "co2_min": round(min(all_co2), 1) if all_co2 else None,
                "co2_max": round(max(all_co2), 1) if all_co2 else None,
                "fc_avg": round(sum(all_fc) / len(all_fc), 2) if all_fc else None,
            },
        }

    # 3) Determine twin status
    has_input = input_specs is not None
    has_output = output_data is not None
    if has_input and has_output:
        twin_status = "complete"
    elif has_input:
        twin_status = "input_only"
    elif has_output:
        twin_status = "output_only"
    else:
        raise HTTPException(404, f"No data found for variant {variant_code}")

    return {
        "variant_code": variant_code,
        "twin_status": twin_status,
        "input": input_specs,
        "output": output_data,
    }


@router.get("/digital-twin-list")
async def get_digital_twin_list(db: AsyncSession = Depends(get_db)):
    """
    List all variants with their input/output/twin status.
    Shows which variants have input specs, output results, or both.
    """
    # Get all input variants
    var_result = await db.execute(
        select(VehicleVariant.variant_code, VehicleVariant.fleet_count,
               VehicleVariant.id, Vehicle.model_name, Vehicle.category)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .order_by(VehicleVariant.variant_code)
    )
    input_variants = {r.variant_code: {
        "variant_id": str(r.id),
        "model": r.model_name,
        "category": str(r.category),
        "fleet_count": r.fleet_count or 0,
    } for r in var_result.all()}

    # Get unique VINs from output results
    output_result = await db.execute(
        select(
            VectoResultCertified.vin,
            VectoResultCertified.vehicle_model,
            VectoResultCertified.engine_rated_power_kw,
            VectoResultCertified.fuel_type,
            VectoResultCertified.vehicle_group,
            func.count(VectoResultCertified.id).label("result_count"),
            func.avg(VectoResultCertified.co2_g_per_km).label("avg_co2"),
            func.min(VectoResultCertified.co2_g_per_km).label("min_co2"),
            func.max(VectoResultCertified.co2_g_per_km).label("max_co2"),
        )
        .where(VectoResultCertified.is_summary == False)
        .group_by(
            VectoResultCertified.vin,
            VectoResultCertified.vehicle_model,
            VectoResultCertified.engine_rated_power_kw,
            VectoResultCertified.fuel_type,
            VectoResultCertified.vehicle_group,
        )
    )
    output_variants = {r.vin: {
        "model": r.vehicle_model,
        "power_kw": float(r.engine_rated_power_kw) if r.engine_rated_power_kw else None,
        "fuel_type": r.fuel_type,
        "vehicle_group": r.vehicle_group,
        "result_count": r.result_count,
        "avg_co2": round(float(r.avg_co2), 1) if r.avg_co2 else None,
        "min_co2": round(float(r.min_co2), 1) if r.min_co2 else None,
        "max_co2": round(float(r.max_co2), 1) if r.max_co2 else None,
    } for r in output_result.all()}

    # Merge into unified list
    all_codes = sorted(set(list(input_variants.keys()) + list(output_variants.keys())))
    twins = []
    for code in all_codes:
        inp = input_variants.get(code)
        out = output_variants.get(code)
        has_input = inp is not None
        has_output = out is not None
        twin = {
            "variant_code": code,
            "has_input": has_input,
            "has_output": has_output,
            "twin_status": "complete" if has_input and has_output else ("input_only" if has_input else "output_only"),
            "model": (inp["model"] if inp else out["model"]) if (inp or out) else None,
            "category": inp["category"] if inp else None,
            "fleet_count": inp["fleet_count"] if inp else 0,
            "variant_id": inp["variant_id"] if inp else None,
            "vehicle_group": out["vehicle_group"] if out else None,
            "result_count": out["result_count"] if out else 0,
            "avg_co2": out["avg_co2"] if out else None,
            "min_co2": out["min_co2"] if out else None,
            "max_co2": out["max_co2"] if out else None,
            "power_kw": out["power_kw"] if out else None,
            "fuel_type": (out["fuel_type"] if out else (inp.get("fuel_type") if inp else None)),
        }
        twins.append(twin)

    return {
        "total": len(twins),
        "complete": sum(1 for t in twins if t["twin_status"] == "complete"),
        "input_only": sum(1 for t in twins if t["twin_status"] == "input_only"),
        "output_only": sum(1 for t in twins if t["twin_status"] == "output_only"),
        "twins": twins,
    }



# ═══════════════════════════════════════════════════════════
# Migration: Re-parse tyre data from XML files
# ═══════════════════════════════════════════════════════════

@router.post("/migrate-tyres")
async def migrate_tyre_data(db: AsyncSession = Depends(get_db)):
    """Re-parse all variant XMLs to populate front/rear tyre columns."""
    from app.services.vecto_parser import parse_vecto_xml
    from pathlib import Path

    vecto_dir = Path("/app/vecto_files")
    updated = 0
    errors = []

    q = await db.execute(select(VehicleVariant.id, VehicleVariant.variant_code))
    variants = q.all()

    for vid, vcode in variants:
        xml_path = vecto_dir / f"{vcode}.xml"
        if not xml_path.exists():
            continue
        try:
            parsed = parse_vecto_xml(str(xml_path))
            vd = parsed["variant"]
            await db.execute(
                update(VehicleVariant)
                .where(VehicleVariant.id == vid)
                .values(
                    tyre_front_manufacturer=vd.get("tyre_front_manufacturer"),
                    tyre_front_model=vd.get("tyre_front_model"),
                    tyre_front_dimension=vd.get("tyre_front_dimension"),
                    tyre_front_rrc=vd.get("tyre_front_rrc"),
                    tyre_front_fz_iso=vd.get("tyre_front_fz_iso"),
                    tyre_front_twin_tyres=vd.get("tyre_front_twin_tyres", False),
                    tyre_rear_manufacturer=vd.get("tyre_rear_manufacturer"),
                    tyre_rear_model=vd.get("tyre_rear_model"),
                    tyre_rear_dimension=vd.get("tyre_rear_dimension"),
                    tyre_rear_rrc=vd.get("tyre_rear_rrc"),
                    tyre_rear_fz_iso=vd.get("tyre_rear_fz_iso"),
                    tyre_rear_twin_tyres=vd.get("tyre_rear_twin_tyres", False),
                )
            )
            updated += 1
        except Exception as e:
            errors.append({"code": vcode, "error": str(e)})

    await db.commit()
    return {"updated": updated, "total": len(variants), "errors": errors}


# ═══════════════════════════════════════════════════════════
# Unified Variants Hub — single endpoint for the variants page
# ═══════════════════════════════════════════════════════════

@router.get("/variants-hub")
async def get_variants_hub(db: AsyncSession = Depends(get_db)):
    """
    Single endpoint for the unified Variants page.
    Returns all variants with input specs + output CO2 merged,
    grouped by model, with fleet-level analytics.
    """
    # 1) Get all input variants with specs
    var_q = await db.execute(
        select(
            VehicleVariant.id,
            VehicleVariant.variant_code,
            VehicleVariant.engine_type,
            VehicleVariant.engine_manufacturer,
            VehicleVariant.engine_model,
            VehicleVariant.displacement_cc,
            VehicleVariant.rated_speed_rpm,
            VehicleVariant.rated_power_w,
            VehicleVariant.max_torque_nm,
            VehicleVariant.idling_speed_rpm,
            VehicleVariant.fuel_type,
            VehicleVariant.max_laden_mass_kg,
            VehicleVariant.curb_weight_kg,
            VehicleVariant.gearbox_manufacturer,
            VehicleVariant.gearbox_model,
            VehicleVariant.gear_count,
            VehicleVariant.gearbox_type,
            VehicleVariant.axle_ratio,
            VehicleVariant.axle_type,
            VehicleVariant.tyre_manufacturer,
            VehicleVariant.tyre_model,
            VehicleVariant.tyre_dimension,
            VehicleVariant.tyre_front_manufacturer,
            VehicleVariant.tyre_front_model,
            VehicleVariant.tyre_front_dimension,
            VehicleVariant.tyre_front_rrc,
            VehicleVariant.tyre_front_twin_tyres,
            VehicleVariant.tyre_rear_manufacturer,
            VehicleVariant.tyre_rear_model,
            VehicleVariant.tyre_rear_dimension,
            VehicleVariant.tyre_rear_rrc,
            VehicleVariant.tyre_rear_twin_tyres,
            VehicleVariant.engine_stop_start,
            VehicleVariant.eco_roll,
            VehicleVariant.predictive_cruise,
            VehicleVariant.fan_technology,
            VehicleVariant.steering_pump_tech,
            VehicleVariant.alternator_tech,
            VehicleVariant.retarder_type,
            VehicleVariant.fleet_count,
            VehicleVariant.zero_emission_vehicle,
            VehicleVariant.whtc_urban,
            VehicleVariant.whtc_rural,
            VehicleVariant.whtc_motorway,
            Vehicle.model_name,
            Vehicle.category,
            Vehicle.chassis_config,
            Vehicle.axle_config,
        )
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .order_by(VehicleVariant.variant_code)
    )
    input_rows = var_q.all()

    # 2) Get output results aggregated per VIN
    out_q = await db.execute(
        select(
            VectoResultCertified.vin,
            VectoResultCertified.vehicle_model,
            VectoResultCertified.vehicle_group,
            VectoResultCertified.engine_rated_power_kw,
            func.count(VectoResultCertified.id).label("result_count"),
            func.avg(VectoResultCertified.co2_g_per_km).label("avg_co2"),
            func.min(VectoResultCertified.co2_g_per_km).label("min_co2"),
            func.max(VectoResultCertified.co2_g_per_km).label("max_co2"),
            func.avg(VectoResultCertified.fc_l_per_100km).label("avg_fc"),
            func.avg(VectoResultCertified.energy_mj_per_km).label("avg_energy"),
        )
        .where(VectoResultCertified.is_summary == False)
        .group_by(
            VectoResultCertified.vin,
            VectoResultCertified.vehicle_model,
            VectoResultCertified.vehicle_group,
            VectoResultCertified.engine_rated_power_kw,
        )
    )
    output_map = {}
    for r in out_q.all():
        output_map[r.vin] = {
            "result_count": r.result_count,
            "avg_co2": round(float(r.avg_co2), 1) if r.avg_co2 else None,
            "min_co2": round(float(r.min_co2), 1) if r.min_co2 else None,
            "max_co2": round(float(r.max_co2), 1) if r.max_co2 else None,
            "avg_fc": round(float(r.avg_fc), 2) if r.avg_fc else None,
            "avg_energy": round(float(r.avg_energy), 3) if r.avg_energy else None,
            "vehicle_group": r.vehicle_group,
            "power_kw_output": float(r.engine_rated_power_kw) if r.engine_rated_power_kw else None,
        }

    # 3) Build unified variant list
    variants = []
    model_groups = {}
    for r in input_rows:
        code = r.variant_code
        out = output_map.get(code, {})
        power_kw = round(r.rated_power_w / 1000, 1) if r.rated_power_w else out.get("power_kw_output")
        model = r.model_name or "Unknown"

        v = {
            "variant_id": str(r.id),
            "variant_code": code,
            "model": model,
            "category": str(r.category) if r.category else None,
            "chassis": r.chassis_config,
            "axle_config": r.axle_config,
            # Engine
            "engine_manufacturer": r.engine_manufacturer,
            "engine_model": r.engine_model,
            "engine_type": str(r.engine_type) if r.engine_type else None,
            "displacement_cc": r.displacement_cc,
            "power_kw": power_kw,
            "power_hp": round(power_kw * 1.341) if power_kw else None,
            "max_torque_nm": float(r.max_torque_nm) if r.max_torque_nm else None,
            "rated_speed_rpm": r.rated_speed_rpm,
            "idling_speed_rpm": r.idling_speed_rpm,
            "fuel_type": r.fuel_type,
            # Vehicle
            "max_laden_mass_kg": float(r.max_laden_mass_kg) if r.max_laden_mass_kg else None,
            "curb_weight_kg": float(r.curb_weight_kg) if r.curb_weight_kg else None,
            "zero_emission": r.zero_emission_vehicle or False,
            # Gearbox
            "gearbox_manufacturer": r.gearbox_manufacturer,
            "gearbox_model": r.gearbox_model,
            "gear_count": r.gear_count,
            "gearbox_type": r.gearbox_type,
            # Axle & Tyre
            "axle_ratio": float(r.axle_ratio) if r.axle_ratio else None,
            "axle_type": r.axle_type,
            "tyre_manufacturer": r.tyre_manufacturer,
            "tyre_model": r.tyre_model,
            "tyre_dimension": r.tyre_dimension,
            "tyre_front_manufacturer": r.tyre_front_manufacturer,
            "tyre_front_model": r.tyre_front_model,
            "tyre_front_dimension": r.tyre_front_dimension,
            "tyre_front_rrc": float(r.tyre_front_rrc) if r.tyre_front_rrc else None,
            "tyre_front_twin_tyres": r.tyre_front_twin_tyres or False,
            "tyre_rear_manufacturer": r.tyre_rear_manufacturer,
            "tyre_rear_model": r.tyre_rear_model,
            "tyre_rear_dimension": r.tyre_rear_dimension,
            "tyre_rear_rrc": float(r.tyre_rear_rrc) if r.tyre_rear_rrc else None,
            "tyre_rear_twin_tyres": r.tyre_rear_twin_tyres or False,
            # ADAS
            "engine_stop_start": r.engine_stop_start or False,
            "eco_roll": r.eco_roll or False,
            "predictive_cruise": r.predictive_cruise,
            # Auxiliaries
            "fan_technology": r.fan_technology,
            "steering_pump_tech": r.steering_pump_tech,
            "alternator_tech": r.alternator_tech,
            "retarder_type": r.retarder_type,
            # CO2 corrections
            "whtc_urban": float(r.whtc_urban) if r.whtc_urban else None,
            "whtc_rural": float(r.whtc_rural) if r.whtc_rural else None,
            "whtc_motorway": float(r.whtc_motorway) if r.whtc_motorway else None,
            # Fleet
            "fleet_count": r.fleet_count or 0,
            # Output data
            "has_output": code in output_map,
            "result_count": out.get("result_count", 0),
            "avg_co2": out.get("avg_co2"),
            "min_co2": out.get("min_co2"),
            "max_co2": out.get("max_co2"),
            "avg_fc": out.get("avg_fc"),
            "avg_energy": out.get("avg_energy"),
            "vehicle_group": out.get("vehicle_group"),
            # Derived performance
            "power_weight_ratio": round(float(power_kw) / (float(r.max_laden_mass_kg) / 1000), 2) if power_kw and r.max_laden_mass_kg else None,
            "torque_density": round(float(r.max_torque_nm) / (float(r.displacement_cc) / 1000), 1) if r.max_torque_nm and r.displacement_cc else None,
        }
        variants.append(v)

        # Group by model
        model_key = model.upper()
        if model_key not in model_groups:
            model_groups[model_key] = {
                "model": model, "category": v["category"],
                "variants": [], "variant_count": 0,
                "co2_values": [], "power_values": [], "torque_values": [],
                "fleet_total": 0, "has_output_count": 0,
            }
        mg = model_groups[model_key]
        mg["variants"].append(code)
        mg["variant_count"] += 1
        mg["fleet_total"] += v["fleet_count"]
        if v["has_output"]:
            mg["has_output_count"] += 1
        if v["avg_co2"]:
            mg["co2_values"].append(v["avg_co2"])
        if v["power_kw"]:
            mg["power_values"].append(v["power_kw"])
        if v["max_torque_nm"]:
            mg["torque_values"].append(float(v["max_torque_nm"]))

    # 4) Compute model summaries
    models = []
    for mk, mg in sorted(model_groups.items()):
        co2 = mg["co2_values"]
        pwr = mg["power_values"]
        trq = mg["torque_values"]
        models.append({
            "model": mg["model"],
            "category": mg["category"],
            "variant_count": mg["variant_count"],
            "variants": mg["variants"],
            "fleet_total": mg["fleet_total"],
            "has_output_count": mg["has_output_count"],
            "data_completeness": round(mg["has_output_count"] / mg["variant_count"] * 100) if mg["variant_count"] else 0,
            "co2_avg": round(sum(co2) / len(co2), 1) if co2 else None,
            "co2_min": round(min(co2), 1) if co2 else None,
            "co2_max": round(max(co2), 1) if co2 else None,
            "co2_spread": round(max(co2) - min(co2), 1) if len(co2) > 1 else 0,
            "power_range": f"{min(pwr):.0f}-{max(pwr):.0f}" if pwr else None,
            "torque_range": f"{min(trq):.0f}-{max(trq):.0f}" if trq else None,
        })

    # 5) Fleet overview analytics
    all_co2 = [v["avg_co2"] for v in variants if v["avg_co2"]]
    total_fleet = sum(v["fleet_count"] for v in variants)
    weighted_co2 = None
    if total_fleet > 0:
        wsum = sum(v["avg_co2"] * v["fleet_count"] for v in variants if v["avg_co2"] and v["fleet_count"] > 0)
        wcount = sum(v["fleet_count"] for v in variants if v["avg_co2"] and v["fleet_count"] > 0)
        weighted_co2 = round(wsum / wcount, 1) if wcount > 0 else None

    analytics = {
        "total_variants": len(variants),
        "total_models": len(models),
        "total_fleet": total_fleet,
        "variants_with_output": sum(1 for v in variants if v["has_output"]),
        "variants_without_output": sum(1 for v in variants if not v["has_output"]),
        "co2_avg": round(sum(all_co2) / len(all_co2), 1) if all_co2 else None,
        "co2_min": round(min(all_co2), 1) if all_co2 else None,
        "co2_max": round(max(all_co2), 1) if all_co2 else None,
        "co2_weighted_fleet": weighted_co2,
        "best_variant": min(variants, key=lambda v: v["avg_co2"] or 99999)["variant_code"] if all_co2 else None,
        "worst_variant": max(variants, key=lambda v: v["avg_co2"] or 0)["variant_code"] if all_co2 else None,
    }

    return {
        "variants": variants,
        "models": models,
        "analytics": analytics,
    }


@router.post("/compare-models")
async def compare_models(
    model_names: list[str] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Compare models side-by-side: aggregated specs + CO2 per model.
    """
    if len(model_names) < 2:
        raise HTTPException(400, "At least 2 models needed")

    results = []
    for model in model_names:
        # Get all variants for this model
        vq = await db.execute(
            select(
                VehicleVariant.variant_code,
                VehicleVariant.rated_power_w,
                VehicleVariant.max_torque_nm,
                VehicleVariant.displacement_cc,
                VehicleVariant.max_laden_mass_kg,
                VehicleVariant.engine_manufacturer,
                VehicleVariant.engine_model,
                VehicleVariant.gearbox_model,
                VehicleVariant.gear_count,
                VehicleVariant.axle_ratio,
                VehicleVariant.tyre_dimension,
                VehicleVariant.fleet_count,
                VehicleVariant.fuel_type,
                Vehicle.model_name,
                Vehicle.category,
            )
            .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
            .where(func.upper(Vehicle.model_name) == model.upper())
        )
        rows = vq.all()
        if not rows:
            continue

        # Get CO2 for these variants
        codes = [r.variant_code for r in rows]
        co2q = await db.execute(
            select(
                VectoResultCertified.vin,
                func.avg(VectoResultCertified.co2_g_per_km).label("avg_co2"),
                func.avg(VectoResultCertified.fc_l_per_100km).label("avg_fc"),
            )
            .where(
                VectoResultCertified.is_summary == False,
                VectoResultCertified.vin.in_(codes),
            )
            .group_by(VectoResultCertified.vin)
        )
        co2_map = {r.vin: {"co2": round(float(r.avg_co2), 1), "fc": round(float(r.avg_fc), 2) if r.avg_fc else None} for r in co2q.all()}

        powers = [r.rated_power_w / 1000 for r in rows if r.rated_power_w]
        torques = [float(r.max_torque_nm) for r in rows if r.max_torque_nm]
        masses = [float(r.max_laden_mass_kg) for r in rows if r.max_laden_mass_kg]
        co2_vals = [co2_map[c]["co2"] for c in codes if c in co2_map]
        fc_vals = [co2_map[c]["fc"] for c in codes if c in co2_map and co2_map[c]["fc"]]
        gears = list(set(r.gearbox_model for r in rows if r.gearbox_model))
        engines = list(set(f"{r.engine_manufacturer} {r.engine_model}" for r in rows if r.engine_model))

        results.append({
            "model": rows[0].model_name,
            "category": str(rows[0].category) if rows[0].category else None,
            "variant_count": len(rows),
            "fleet_total": sum(r.fleet_count or 0 for r in rows),
            "engines": engines,
            "gearboxes": gears,
            "fuel_type": rows[0].fuel_type,
            "power_avg": round(sum(powers) / len(powers), 1) if powers else None,
            "power_range": [round(min(powers), 1), round(max(powers), 1)] if powers else None,
            "torque_avg": round(sum(torques) / len(torques), 1) if torques else None,
            "torque_range": [round(min(torques)), round(max(torques))] if torques else None,
            "mass_avg": round(sum(masses) / len(masses)) if masses else None,
            "mass_range": [round(min(masses)), round(max(masses))] if masses else None,
            "co2_avg": round(sum(co2_vals) / len(co2_vals), 1) if co2_vals else None,
            "co2_min": round(min(co2_vals), 1) if co2_vals else None,
            "co2_max": round(max(co2_vals), 1) if co2_vals else None,
            "fc_avg": round(sum(fc_vals) / len(fc_vals), 2) if fc_vals else None,
            "variants_with_co2": len(co2_vals),
        })

    return {"models": results}


@router.post("/compare-variants")
async def compare_variants_detailed(
    variant_codes: list[str] = Body(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Compare specific variants side-by-side with full input + output data.
    """
    if len(variant_codes) < 2:
        raise HTTPException(400, "At least 2 variants needed")

    results = []
    for code in variant_codes:
        # Input specs
        vq = await db.execute(
            select(VehicleVariant, Vehicle.model_name, Vehicle.category)
            .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
            .where(VehicleVariant.variant_code == code)
        )
        row = vq.first()
        if not row:
            continue
        v = row[0]
        power_kw = round(v.rated_power_w / 1000, 1) if v.rated_power_w else None

        # Output CO2 per mission
        co2q = await db.execute(
            select(VectoResultCertified)
            .where(
                VectoResultCertified.vin == code,
                VectoResultCertified.is_summary == False,
            )
        )
        missions = []
        co2_vals = []
        for cr in co2q.scalars().all():
            co2_vals.append(float(cr.co2_g_per_km) if cr.co2_g_per_km else 0)
            missions.append({
                "mission": cr.mission,
                "loading": cr.loading,
                "subgroup": cr.primary_subgroup,
                "co2_g_km": round(float(cr.co2_g_per_km), 1) if cr.co2_g_per_km else None,
                "fc_l_100km": round(float(cr.fc_l_per_100km), 2) if cr.fc_l_per_100km else None,
                "energy_mj_km": round(float(cr.energy_mj_per_km), 3) if cr.energy_mj_per_km else None,
                "distance_km": round(float(cr.distance_km), 1) if cr.distance_km else None,
                "avg_speed": round(float(cr.avg_speed_kmh), 1) if cr.avg_speed_kmh else None,
            })

        results.append({
            "variant_code": code,
            "model": row.model_name,
            "category": str(row.category) if row.category else None,
            "engine": f"{v.engine_manufacturer} {v.engine_model}",
            "power_kw": power_kw,
            "power_hp": round(power_kw * 1.341) if power_kw else None,
            "max_torque_nm": float(v.max_torque_nm) if v.max_torque_nm else None,
            "displacement_cc": v.displacement_cc,
            "fuel_type": v.fuel_type,
            "max_laden_mass_kg": float(v.max_laden_mass_kg) if v.max_laden_mass_kg else None,
            "curb_weight_kg": float(v.curb_weight_kg) if v.curb_weight_kg else None,
            "gearbox": f"{v.gearbox_manufacturer} {v.gearbox_model}",
            "gear_count": v.gear_count,
            "gearbox_type": v.gearbox_type,
            "axle_ratio": float(v.axle_ratio) if v.axle_ratio else None,
            "axle_type": v.axle_type,
            "tyre": f"{v.tyre_manufacturer} {v.tyre_model} {v.tyre_dimension}",
            "tyre_front": f"{v.tyre_front_manufacturer or ''} {v.tyre_front_model or ''} {v.tyre_front_dimension or ''}".strip(),
            "tyre_rear": f"{v.tyre_rear_manufacturer or ''} {v.tyre_rear_model or ''} {v.tyre_rear_dimension or ''}".strip(),
            "tyre_front_dimension": v.tyre_front_dimension,
            "tyre_rear_dimension": v.tyre_rear_dimension,
            "engine_stop_start": v.engine_stop_start or False,
            "eco_roll": v.eco_roll or False,
            "predictive_cruise": v.predictive_cruise,
            "fleet_count": v.fleet_count or 0,
            "power_weight_ratio": round(power_kw / (float(v.max_laden_mass_kg) / 1000), 2) if power_kw and v.max_laden_mass_kg else None,
            # Output
            "has_output": len(missions) > 0,
            "co2_avg": round(sum(co2_vals) / len(co2_vals), 1) if co2_vals else None,
            "co2_min": round(min(co2_vals), 1) if co2_vals else None,
            "co2_max": round(max(co2_vals), 1) if co2_vals else None,
            "missions": missions,
        })

    return {"variants": results}


# ═══════════════════════════════════════════════════════════
# Output Files Import — RSLT_MANUFACTURER + VIF bulk import
# ═══════════════════════════════════════════════════════════

@router.post("/import-output-directory")
async def import_output_directory(
    directory: str = Query(..., description="Path to Output Files folder"),
    db: AsyncSession = Depends(get_db),
):
    """
    Import all RSLT_MANUFACTURER output files from a directory.
    Pairs each with its corresponding RSLT_VIF for PrimaryVehicleSubgroup.
    Each variant code is extracted from the filename.
    """
    if not os.path.isdir(directory):
        raise HTTPException(400, f"Directory not found: {directory}")

    mfr_files = glob.glob(os.path.join(directory, "*.RSLT_MANUFACTURER.xml"))
    if not mfr_files:
        raise HTTPException(400, "No RSLT_MANUFACTURER.xml files found")

    imported_variants = 0
    imported_results = 0
    errors = []

    for mfr_path in sorted(mfr_files):
        basename = os.path.basename(mfr_path)
        variant_code = basename.split(".")[0]

        # Find matching VIF
        vif_path = os.path.join(directory, f"{variant_code}.RSLT_VIF.xml")
        if not os.path.exists(vif_path):
            vif_path = None

        try:
            parsed = parse_manufacturer_output_xml(mfr_path, vif_path)
            if "error" in parsed and not parsed.get("results"):
                errors.append({"file": basename, "error": parsed["error"]})
                continue

            veh = parsed.get("vehicle", {})
            sim_info = parsed.get("simulation_info", {})

            # Match variant by variant_code first, then by model+power
            variant_id = await _match_variant_by_code(db, variant_code)
            if not variant_id:
                variant_id = await _match_variant(db, veh)

            # Delete existing results for this variant_code/VIN to avoid duplicates
            existing = await db.execute(
                select(VectoResultCertified.id)
                .where(VectoResultCertified.source_file.ilike(f"%{variant_code}%"))
            )
            existing_ids = [r[0] for r in existing.all()]
            if existing_ids:
                from sqlalchemy import delete as sql_delete
                await db.execute(
                    sql_delete(VectoResultCertified)
                    .where(VectoResultCertified.id.in_(existing_ids))
                )

            count = 0
            for r in parsed.get("results", []):
                rec = VectoResultCertified(
                    variant_id=variant_id,
                    vin=variant_code,
                    vehicle_model=veh.get("model"),
                    vehicle_category=veh.get("vehicle_category"),
                    vehicle_group=veh.get("vehicle_group"),
                    vehicle_group_co2=veh.get("vehicle_group_co2"),
                    class_bus=veh.get("class_bus"),
                    axle_configuration=veh.get("axle_configuration"),
                    corrected_actual_mass_kg=veh.get("corrected_actual_mass_kg"),
                    tech_max_laden_mass_kg=veh.get("tech_max_laden_mass_kg"),
                    total_propulsion_power_kw=veh.get("total_propulsion_power_kw"),
                    total_passengers=int(veh["total_passengers"]) if veh.get("total_passengers") else None,
                    mission=r.get("mission", "Unknown"),
                    loading=r.get("loading", "Unknown"),
                    primary_subgroup=r.get("primary_subgroup"),
                    distance_km=r.get("distance_km"),
                    total_vehicle_mass_kg=r.get("total_vehicle_mass_kg"),
                    payload_kg=r.get("payload_kg"),
                    passenger_count=r.get("passenger_count"),
                    avg_speed_kmh=r.get("avg_speed_kmh"),
                    avg_driving_speed_kmh=r.get("avg_driving_speed_kmh"),
                    max_speed_kmh=r.get("max_speed_kmh"),
                    gearbox_efficiency_pct=r.get("gearbox_efficiency_pct"),
                    axlegear_efficiency_pct=r.get("axlegear_efficiency_pct"),
                    gearshift_count=r.get("gearshift_count"),
                    energy_mj_per_km=r.get("energy_mj_per_km"),
                    co2_g_per_km=r.get("co2_g_per_km"),
                    co2_g_per_pkm=r.get("co2_g_per_pkm"),
                    fc_g_per_km=r.get("fc_g_per_km"),
                    fc_g_per_pkm=r.get("fc_g_per_pkm"),
                    fc_mj_per_km=r.get("fc_mj_per_km"),
                    fc_mj_per_pkm=r.get("fc_mj_per_pkm"),
                    fc_l_per_100km=r.get("fc_l_per_100km"),
                    fc_l_per_pkm=r.get("fc_l_per_pkm"),
                    engine_rated_power_kw=veh.get("engine_rated_power_kw"),
                    fuel_type=veh.get("fuel_type"),
                    transmission_type=veh.get("transmission_type"),
                    axle_ratio=float(veh["axle_ratio"]) if veh.get("axle_ratio") else None,
                    source_file=mfr_path,
                    source_type="RSLT_MANUFACTURER",
                    simulation_tool_version=sim_info.get("tool_version"),
                    simulation_date=sim_info.get("date_parsed"),
                    status="success",
                    is_summary=False,
                )
                db.add(rec)
                count += 1

            imported_results += count
            imported_variants += 1

        except Exception as e:
            logger.error(f"Error importing {basename}: {e}")
            errors.append({"file": basename, "error": str(e)})

    await db.commit()

    return {
        "status": "success",
        "variants_imported": imported_variants,
        "results_imported": imported_results,
        "errors": errors,
        "error_count": len(errors),
    }


# ═══════════════════════════════════════════════════════════
# Variant Output Results — per-variant CO2 matrix
# ═══════════════════════════════════════════════════════════

@router.get("/variant-results")
async def get_variant_results(db: AsyncSession = Depends(get_db)):
    """
    Get all variant output results grouped by variant (VIN/variant_code).
    Each variant has results per subgroup × mission × loading.
    """
    result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.is_summary == False)
        .order_by(VectoResultCertified.vin, VectoResultCertified.primary_subgroup, VectoResultCertified.mission)
    )
    all_results = result.scalars().all()

    by_vin = {}
    for r in all_results:
        vin = r.vin
        if vin not in by_vin:
            by_vin[vin] = {
                "vin": vin,
                "model": r.vehicle_model,
                "vehicle_group": r.vehicle_group,
                "fuel_type": r.fuel_type,
                "tech_max_laden_mass_kg": float(r.tech_max_laden_mass_kg) if r.tech_max_laden_mass_kg else None,
                "engine_rated_power_kw": float(r.engine_rated_power_kw) if r.engine_rated_power_kw else None,
                "axle_ratio": float(r.axle_ratio) if r.axle_ratio else None,
                "variant_id": str(r.variant_id) if r.variant_id else None,
                "subgroups": {},
                "result_count": 0,
                "avg_co2_g_km": 0,
                "min_co2_g_km": None,
                "max_co2_g_km": None,
            }

        sg = r.primary_subgroup or "Unknown"
        if sg not in by_vin[vin]["subgroups"]:
            by_vin[vin]["subgroups"][sg] = []

        entry = {
            "mission": r.mission,
            "loading": r.loading,
            "co2_g_km": float(r.co2_g_per_km) if r.co2_g_per_km else None,
            "co2_g_pkm": float(r.co2_g_per_pkm) if r.co2_g_per_pkm else None,
            "fc_g_km": float(r.fc_g_per_km) if r.fc_g_per_km else None,
            "fc_l_100km": float(r.fc_l_per_100km) if r.fc_l_per_100km else None,
            "fc_mj_km": float(r.fc_mj_per_km) if r.fc_mj_per_km else None,
            "energy_mj_km": float(r.energy_mj_per_km) if r.energy_mj_per_km else None,
            "distance_km": float(r.distance_km) if r.distance_km else None,
            "passenger_count": float(r.passenger_count) if r.passenger_count else None,
            "total_mass_kg": float(r.total_vehicle_mass_kg) if r.total_vehicle_mass_kg else None,
            "payload_kg": float(r.payload_kg) if r.payload_kg else None,
            "avg_speed": float(r.avg_speed_kmh) if r.avg_speed_kmh else None,
            "avg_driving_speed": float(r.avg_driving_speed_kmh) if r.avg_driving_speed_kmh else None,
            "gearbox_eff": float(r.gearbox_efficiency_pct) if r.gearbox_efficiency_pct else None,
            "axlegear_eff": float(r.axlegear_efficiency_pct) if r.axlegear_efficiency_pct else None,
            "gearshift_count": r.gearshift_count,
        }
        by_vin[vin]["subgroups"][sg].append(entry)
        by_vin[vin]["result_count"] += 1

    # Compute per-variant stats
    for vin, vdata in by_vin.items():
        co2_vals = []
        for sg, missions in vdata["subgroups"].items():
            for m in missions:
                if m["co2_g_km"]:
                    co2_vals.append(m["co2_g_km"])
        if co2_vals:
            vdata["avg_co2_g_km"] = round(sum(co2_vals) / len(co2_vals), 1)
            vdata["min_co2_g_km"] = round(min(co2_vals), 1)
            vdata["max_co2_g_km"] = round(max(co2_vals), 1)

    variants_list = sorted(by_vin.values(), key=lambda x: x["vin"])

    return {
        "total_variants": len(variants_list),
        "total_results": sum(v["result_count"] for v in variants_list),
        "variants": variants_list,
    }


@router.get("/variant-results/{vin}")
async def get_variant_result_detail(vin: str, db: AsyncSession = Depends(get_db)):
    """Get detailed results for a specific variant by VIN/variant_code."""
    result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.vin == vin)
        .where(VectoResultCertified.is_summary == False)
        .order_by(VectoResultCertified.primary_subgroup, VectoResultCertified.mission)
    )
    recs = result.scalars().all()

    if not recs:
        raise HTTPException(404, f"No results found for {vin}")

    r0 = recs[0]
    vehicle_info = {
        "vin": vin,
        "model": r0.vehicle_model,
        "vehicle_group": r0.vehicle_group,
        "vehicle_category": r0.vehicle_category,
        "axle_configuration": r0.axle_configuration,
        "tech_max_laden_mass_kg": float(r0.tech_max_laden_mass_kg) if r0.tech_max_laden_mass_kg else None,
        "engine_rated_power_kw": float(r0.engine_rated_power_kw) if r0.engine_rated_power_kw else None,
        "fuel_type": r0.fuel_type,
        "axle_ratio": float(r0.axle_ratio) if r0.axle_ratio else None,
        "tool_version": r0.simulation_tool_version,
    }

    # Group by subgroup
    subgroups = {}
    all_co2 = []
    for r in recs:
        sg = r.primary_subgroup or "Unknown"
        if sg not in subgroups:
            subgroups[sg] = {"missions": [], "co2_avg": None}
        co2 = float(r.co2_g_per_km) if r.co2_g_per_km else None
        if co2:
            all_co2.append(co2)
        subgroups[sg]["missions"].append({
            "mission": r.mission,
            "loading": r.loading,
            "co2_g_km": co2,
            "co2_g_pkm": float(r.co2_g_per_pkm) if r.co2_g_per_pkm else None,
            "fc_g_km": float(r.fc_g_per_km) if r.fc_g_per_km else None,
            "fc_l_100km": float(r.fc_l_per_100km) if r.fc_l_per_100km else None,
            "fc_mj_km": float(r.fc_mj_per_km) if r.fc_mj_per_km else None,
            "energy_mj_km": float(r.energy_mj_per_km) if r.energy_mj_per_km else None,
            "distance_km": float(r.distance_km) if r.distance_km else None,
            "passenger_count": float(r.passenger_count) if r.passenger_count else None,
            "total_mass_kg": float(r.total_vehicle_mass_kg) if r.total_vehicle_mass_kg else None,
            "payload_kg": float(r.payload_kg) if r.payload_kg else None,
            "avg_speed": float(r.avg_speed_kmh) if r.avg_speed_kmh else None,
            "gearbox_eff": float(r.gearbox_efficiency_pct) if r.gearbox_efficiency_pct else None,
            "axlegear_eff": float(r.axlegear_efficiency_pct) if r.axlegear_efficiency_pct else None,
            "gearshift_count": r.gearshift_count,
        })

    # Per-subgroup averages
    for sg, data in subgroups.items():
        sg_co2 = [m["co2_g_km"] for m in data["missions"] if m["co2_g_km"]]
        data["co2_avg"] = round(sum(sg_co2) / len(sg_co2), 1) if sg_co2 else None

    return {
        "vehicle": vehicle_info,
        "subgroups": subgroups,
        "summary": {
            "total_results": len(recs),
            "co2_avg": round(sum(all_co2) / len(all_co2), 1) if all_co2 else None,
            "co2_min": round(min(all_co2), 1) if all_co2 else None,
            "co2_max": round(max(all_co2), 1) if all_co2 else None,
        },
    }


# ═══════════════════════════════════════════════════════════
# Fleet CO2 Calculation — EU 2017/2400 weighted emissions
# ═══════════════════════════════════════════════════════════

@router.get("/fleet-co2-calculation")
async def get_fleet_co2_calculation(db: AsyncSession = Depends(get_db)):
    """
    Fleet CO2 calculation per EU 2017/2400.
    For each subgroup of each variant:
      CO2_fleet = SUM(fleet_count_v × avg_CO2_v) / SUM(fleet_count_v)
    Broken down by mission profile and subgroup.
    """
    # Get all non-summary results
    result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.is_summary == False)
        .order_by(VectoResultCertified.vin)
    )
    all_results = result.scalars().all()

    # Get fleet counts from variants
    var_result = await db.execute(
        select(VehicleVariant.id, VehicleVariant.variant_code, VehicleVariant.fleet_count,
               Vehicle.model_name)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    variant_fleet = {}
    for r in var_result.all():
        variant_fleet[str(r.id)] = {
            "variant_code": r.variant_code,
            "fleet_count": r.fleet_count or 0,
            "model_name": r.model_name,
        }

    # Also build VIN→fleet_count map (for variants matched by VIN = variant_code)
    vin_fleet = {}
    for vid, vinfo in variant_fleet.items():
        if vinfo["fleet_count"] > 0:
            vin_fleet[vinfo["variant_code"]] = vinfo

    # Group results by VIN
    by_vin = {}
    for r in all_results:
        vin = r.vin
        if vin not in by_vin:
            by_vin[vin] = {
                "model": r.vehicle_model,
                "variant_id": str(r.variant_id) if r.variant_id else None,
                "fleet_count": 0,
                "results": [],
            }
        by_vin[vin]["results"].append(r)

    # Assign fleet counts
    for vin, vdata in by_vin.items():
        # Try by variant_id
        if vdata["variant_id"] and vdata["variant_id"] in variant_fleet:
            vdata["fleet_count"] = variant_fleet[vdata["variant_id"]]["fleet_count"]
        elif vin in vin_fleet:
            vdata["fleet_count"] = vin_fleet[vin]["fleet_count"]

    # Calculate fleet emissions by subgroup × mission
    fleet_by_sg_mission = {}  # sg → mission → {weighted_co2, total_count, ...}
    fleet_by_mission = {}     # mission → {weighted_co2, total_count}
    fleet_by_variant = []
    total_fleet_vehicles = 0
    total_fleet_weighted_co2 = 0

    for vin, vdata in by_vin.items():
        count = vdata["fleet_count"]
        variant_co2_vals = []

        for r in vdata["results"]:
            sg = r.primary_subgroup or "Unknown"
            mission = r.mission
            co2 = float(r.co2_g_per_km) if r.co2_g_per_km else None
            fc_l = float(r.fc_l_per_100km) if r.fc_l_per_100km else None
            energy = float(r.energy_mj_per_km) if r.energy_mj_per_km else None

            if co2:
                variant_co2_vals.append(co2)

            if co2 and count > 0:
                # By subgroup × mission
                key = f"{sg}|{mission}|{r.loading}"
                if key not in fleet_by_sg_mission:
                    fleet_by_sg_mission[key] = {
                        "subgroup": sg, "mission": mission, "loading": r.loading,
                        "weighted_co2": 0, "weighted_fc": 0, "weighted_energy": 0,
                        "total_count": 0, "variants": 0,
                    }
                fleet_by_sg_mission[key]["weighted_co2"] += co2 * count
                fleet_by_sg_mission[key]["weighted_fc"] += (fc_l or 0) * count
                fleet_by_sg_mission[key]["weighted_energy"] += (energy or 0) * count
                fleet_by_sg_mission[key]["total_count"] += count
                fleet_by_sg_mission[key]["variants"] += 1

                # By mission (aggregated across subgroups)
                mkey = f"{mission}|{r.loading}"
                if mkey not in fleet_by_mission:
                    fleet_by_mission[mkey] = {
                        "mission": mission, "loading": r.loading,
                        "weighted_co2": 0, "total_count": 0,
                    }
                fleet_by_mission[mkey]["weighted_co2"] += co2 * count
                fleet_by_mission[mkey]["total_count"] += count

        # Per-variant summary
        avg_co2 = round(sum(variant_co2_vals) / len(variant_co2_vals), 1) if variant_co2_vals else None
        fleet_by_variant.append({
            "vin": vin,
            "model": vdata["model"],
            "fleet_count": count,
            "result_count": len(vdata["results"]),
            "avg_co2_g_km": avg_co2,
            "fleet_co2_total": round(avg_co2 * count, 1) if avg_co2 and count > 0 else None,
        })
        if count > 0:
            total_fleet_vehicles += count
            if avg_co2:
                total_fleet_weighted_co2 += avg_co2 * count

    # Compute averages for subgroup × mission
    sg_mission_results = []
    for key, data in fleet_by_sg_mission.items():
        n = data["total_count"]
        sg_mission_results.append({
            "subgroup": data["subgroup"],
            "mission": data["mission"],
            "loading": data["loading"],
            "fleet_avg_co2_g_km": round(data["weighted_co2"] / n, 1) if n > 0 else None,
            "fleet_avg_fc_l_100km": round(data["weighted_fc"] / n, 1) if n > 0 and data["weighted_fc"] else None,
            "fleet_avg_energy_mj_km": round(data["weighted_energy"] / n, 2) if n > 0 and data["weighted_energy"] else None,
            "total_vehicles": n,
            "variant_count": data["variants"],
        })
    sg_mission_results.sort(key=lambda x: (x["subgroup"], x["mission"], x["loading"]))

    mission_results = []
    for mkey, data in fleet_by_mission.items():
        n = data["total_count"]
        mission_results.append({
            "mission": data["mission"],
            "loading": data["loading"],
            "fleet_avg_co2_g_km": round(data["weighted_co2"] / n, 1) if n > 0 else None,
            "total_vehicles": n,
        })
    mission_results.sort(key=lambda x: (x["mission"], x["loading"]))

    fleet_avg = round(total_fleet_weighted_co2 / total_fleet_vehicles, 1) if total_fleet_vehicles > 0 else None

    # Contribution percentages
    for v in fleet_by_variant:
        if v["fleet_co2_total"] and total_fleet_weighted_co2 > 0:
            v["contribution_pct"] = round(v["fleet_co2_total"] / total_fleet_weighted_co2 * 100, 1)
        else:
            v["contribution_pct"] = None

    fleet_by_variant.sort(key=lambda x: x["fleet_co2_total"] or 0, reverse=True)

    return {
        "fleet_summary": {
            "total_fleet_vehicles": total_fleet_vehicles,
            "fleet_avg_co2_g_km": fleet_avg,
            "total_weighted_co2": round(total_fleet_weighted_co2, 1),
            "total_variants_with_results": len(by_vin),
            "variants_in_fleet": sum(1 for v in fleet_by_variant if v["fleet_count"] > 0),
        },
        "by_subgroup_mission": sg_mission_results,
        "by_mission": mission_results,
        "by_variant": fleet_by_variant,
    }


# ═══════════════════════════════════════════════════════════
# Fleet Count Management
# ═══════════════════════════════════════════════════════════

class FleetCountUpdate(BaseModel):
    variant_id: str
    fleet_count: int

class FleetCountBulk(BaseModel):
    updates: list[FleetCountUpdate]

@router.post("/fleet-count")
async def update_fleet_counts(data: FleetCountBulk, db: AsyncSession = Depends(get_db)):
    """Update fleet vehicle counts per variant (how many of each variant in fleet)."""
    updated = 0
    for u in data.updates:
        await db.execute(
            update(VehicleVariant)
            .where(VehicleVariant.id == u.variant_id)
            .values(fleet_count=u.fleet_count)
        )
        updated += 1
    await db.commit()
    return {"updated": updated}


@router.get("/fleet-tracking")
async def get_fleet_tracking(db: AsyncSession = Depends(get_db)):
    """
    Fleet CO2 tracking: variant CO2 × fleet count = fleet total.
    Shows fleet-wide CO2 contribution by model/variant.
    """
    # Get variants with fleet counts
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .where(VehicleVariant.fleet_count > 0)
    )
    rows = result.all()

    fleet_items = []
    total_vehicles = 0
    total_weighted_co2 = 0

    for v, veh in rows:
        count = v.fleet_count or 0
        if count <= 0:
            continue

        # Get summary CO2 from certified results for this variant
        co2_result = await db.execute(
            select(VectoResultCertified)
            .where(VectoResultCertified.variant_id == v.id)
            .where(VectoResultCertified.is_summary == True)
        )
        summary = co2_result.scalars().first()

        # If no direct match, try by VIN pattern or model
        if not summary:
            co2_result = await db.execute(
                select(VectoResultCertified)
                .where(VectoResultCertified.is_summary == True)
                .where(VectoResultCertified.vehicle_model == veh.model_name)
            )
            summary = co2_result.scalars().first()

        co2 = float(summary.co2_g_per_km) if summary and summary.co2_g_per_km else None
        fc = float(summary.fc_l_per_100km) if summary and summary.fc_l_per_100km else None

        fleet_items.append({
            "variant_id": str(v.id),
            "variant_code": v.variant_code,
            "model_name": veh.model_name,
            "fleet_count": count,
            "co2_g_km": co2,
            "fc_l_100km": fc,
            "fleet_co2_total": round(co2 * count, 1) if co2 else None,
            "fleet_contribution_pct": None,  # calculated below
        })
        total_vehicles += count
        if co2:
            total_weighted_co2 += co2 * count

    # Calculate contribution percentages
    for item in fleet_items:
        if item["fleet_co2_total"] and total_weighted_co2 > 0:
            item["fleet_contribution_pct"] = round(item["fleet_co2_total"] / total_weighted_co2 * 100, 1)

    fleet_avg_co2 = round(total_weighted_co2 / total_vehicles, 1) if total_vehicles > 0 else None

    return {
        "total_vehicles_in_fleet": total_vehicles,
        "fleet_avg_co2_g_km": fleet_avg_co2,
        "total_weighted_co2": round(total_weighted_co2, 1),
        "items": fleet_items,
    }


# ═══════════════════════════════════════════════════════════
# Correlation — VECTO Results vs Real Test Data
# ═══════════════════════════════════════════════════════════

class TestDataInput(BaseModel):
    variant_id: str
    test_type: str = "track"  # track, road, endurance, customer
    co2_g_per_km: Optional[float] = None
    fuel_l_per_100km: Optional[float] = None
    energy_kwh_per_km: Optional[float] = None
    conditions: Optional[dict] = None
    notes: Optional[str] = None
    tested_at: Optional[str] = None

@router.post("/test-data")
async def add_test_data(data: TestDataInput, db: AsyncSession = Depends(get_db)):
    """Add real test data from test team for correlation analysis."""
    rec = RealTestResult(
        variant_id=data.variant_id,
        test_type=data.test_type,
        co2_g_per_km=data.co2_g_per_km,
        fuel_l_per_100km=data.fuel_l_per_100km,
        energy_kwh_per_km=data.energy_kwh_per_km,
        conditions=data.conditions or {},
        notes=data.notes,
        tested_at=datetime.fromisoformat(data.tested_at) if data.tested_at else datetime.utcnow(),
    )
    db.add(rec)
    await db.commit()
    return {"status": "ok", "id": str(rec.id)}


@router.get("/correlation")
async def get_correlation(db: AsyncSession = Depends(get_db)):
    """
    Correlation: VECTO certified results vs real test data.
    This compares official simulation CO2 with measured test CO2.
    """
    # Get certified VECTO summaries by variant
    vecto_result = await db.execute(
        select(VectoResultCertified, VehicleVariant, Vehicle)
        .join(VehicleVariant, VehicleVariant.id == VectoResultCertified.variant_id, isouter=True)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id, isouter=True)
        .where(VectoResultCertified.is_summary == True)
    )
    vecto_summaries = vecto_result.all()

    # Get all certified results (non-summary) for per-mission view
    vecto_detail_result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.is_summary == False)
    )
    vecto_details = vecto_detail_result.scalars().all()

    # Get real test data
    test_result = await db.execute(
        select(RealTestResult, VehicleVariant, Vehicle)
        .join(VehicleVariant, VehicleVariant.id == RealTestResult.variant_id)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    test_rows = test_result.all()

    # Build correlation pairs (VECTO summary vs test data, matched by variant)
    pairs = []
    for tr, tv, tveh in test_rows:
        # Find VECTO summary for same variant
        matching_vecto = None
        for vr, vv, vveh in vecto_summaries:
            if vr.variant_id and tr.variant_id and str(vr.variant_id) == str(tr.variant_id):
                matching_vecto = vr
                break
        if not matching_vecto:
            continue

        vecto_co2 = float(matching_vecto.co2_g_per_km) if matching_vecto.co2_g_per_km else None
        test_co2 = float(tr.co2_g_per_km) if tr.co2_g_per_km else None
        if vecto_co2 and test_co2:
            diff = test_co2 - vecto_co2
            pairs.append({
                "variant_id": str(tr.variant_id),
                "model_name": tveh.model_name,
                "variant_code": tv.variant_code,
                "test_type": str(tr.test_type),
                "vecto_co2": vecto_co2,
                "test_co2": test_co2,
                "delta": round(diff, 1),
                "delta_pct": round(diff / vecto_co2 * 100, 1) if vecto_co2 else None,
                "vecto_fc": float(matching_vecto.fc_l_per_100km) if matching_vecto.fc_l_per_100km else None,
                "test_fc": float(tr.fuel_l_per_100km) if tr.fuel_l_per_100km else None,
                "test_date": tr.tested_at.isoformat() if tr.tested_at else None,
                "test_notes": tr.notes,
            })

    # Statistics
    summary = _calc_correlation_stats(pairs)

    # Build VECTO overview (all results for display even without test data)
    vecto_overview = []
    for r in vecto_details:
        vecto_overview.append({
            "vin": r.vin,
            "model": r.vehicle_model,
            "mission": r.mission,
            "loading": r.loading,
            "co2_g_km": float(r.co2_g_per_km) if r.co2_g_per_km else None,
            "fc_l_100km": float(r.fc_l_per_100km) if r.fc_l_per_100km else None,
        })

    return {
        "summary": summary,
        "pairs": pairs,
        "vecto_results_count": len(vecto_details),
        "test_results_count": len(test_rows),
        "vecto_overview": vecto_overview,
    }


# ═══════════════════════════════════════════════════════════
# Named Fleet Management — create, list, update, delete, compare
# ═══════════════════════════════════════════════════════════

class FleetItemIn(BaseModel):
    vin: str
    count: int = 1

class FleetCreate(BaseModel):
    name: str
    description: str = ""
    items: list[FleetItemIn] = []

class FleetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    items: Optional[list[FleetItemIn]] = None


@router.get("/fleets")
async def list_fleets(db: AsyncSession = Depends(get_db)):
    """List all named fleets with summary info."""
    result = await db.execute(
        select(Fleet).order_by(Fleet.updated_at.desc())
    )
    fleets = result.scalars().all()

    # Get all VINs that have VECTO results for CO2 + model lookup
    # First try summaries
    vecto_q = await db.execute(
        select(
            VectoResultCertified.vin,
            VectoResultCertified.vehicle_model,
            VectoResultCertified.summary_co2_g_per_km,
            VectoResultCertified.summary_fc_l_per_100km,
        ).where(VectoResultCertified.is_summary == True)
    )
    vin_co2 = {}
    for r in vecto_q.all():
        vin_co2[r.vin] = {
            "model": r.vehicle_model,
            "co2": float(r.summary_co2_g_per_km) if r.summary_co2_g_per_km else None,
            "fc": float(r.summary_fc_l_per_100km) if r.summary_fc_l_per_100km else None,
        }

    # For VINs without summaries, compute avg CO2 from per-mission results
    non_summary_q = await db.execute(
        text("""
            SELECT vin, vehicle_model,
                   AVG(co2_g_per_km) as avg_co2,
                   AVG(fc_l_per_100km) as avg_fc
            FROM vecto_results_certified
            WHERE is_summary = false
            GROUP BY vin, vehicle_model
        """)
    )
    for r in non_summary_q.all():
        if r.vin not in vin_co2:
            vin_co2[r.vin] = {
                "model": r.vehicle_model or "",
                "co2": round(float(r.avg_co2), 1) if r.avg_co2 else None,
                "fc": round(float(r.avg_fc), 1) if r.avg_fc else None,
            }

    out = []
    for f in fleets:
        # Load items
        items_q = await db.execute(
            select(FleetItem).where(FleetItem.fleet_id == f.id)
        )
        items = items_q.scalars().all()

        total_vehicles = sum(it.count for it in items)
        models_set = set()
        weighted_co2 = 0
        total_with_co2 = 0

        item_list = []
        for it in items:
            info = vin_co2.get(it.vin, {})
            model = info.get("model", "")
            co2 = info.get("co2")
            if model:
                models_set.add(model)
            if co2 and it.count > 0:
                weighted_co2 += co2 * it.count
                total_with_co2 += it.count
            item_list.append({
                "vin": it.vin,
                "count": it.count,
                "model": model,
                "co2": co2,
            })

        fleet_avg = round(weighted_co2 / total_with_co2, 1) if total_with_co2 > 0 else None

        out.append({
            "id": str(f.id),
            "name": f.name,
            "description": f.description or "",
            "total_vehicles": total_vehicles,
            "variant_count": len(items),
            "models": sorted(models_set),
            "fleet_avg_co2": fleet_avg,
            "items": item_list,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        })

    return out


@router.post("/fleets")
async def create_fleet(data: FleetCreate, db: AsyncSession = Depends(get_db)):
    """Create a new named fleet."""
    if not data.name or not data.name.strip():
        raise HTTPException(400, "Fleet name is required")

    fleet = Fleet(name=data.name.strip(), description=data.description or "")
    db.add(fleet)
    await db.flush()

    for item in data.items:
        fi = FleetItem(fleet_id=fleet.id, vin=item.vin, count=item.count)
        db.add(fi)

    await db.commit()
    await db.refresh(fleet)
    return {"id": str(fleet.id), "name": fleet.name}


@router.get("/fleets/{fleet_id}")
async def get_fleet(fleet_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single fleet with full details and CO2 breakdown."""
    result = await db.execute(select(Fleet).where(Fleet.id == fleet_id))
    fleet = result.scalars().first()
    if not fleet:
        raise HTTPException(404, "Fleet not found")

    items_q = await db.execute(
        select(FleetItem).where(FleetItem.fleet_id == fleet.id)
    )
    items = items_q.scalars().all()

    return await _build_fleet_detail(db, fleet, items)


@router.put("/fleets/{fleet_id}")
async def update_fleet(fleet_id: UUID, data: FleetUpdate, db: AsyncSession = Depends(get_db)):
    """Update fleet name/description/items."""
    result = await db.execute(select(Fleet).where(Fleet.id == fleet_id))
    fleet = result.scalars().first()
    if not fleet:
        raise HTTPException(404, "Fleet not found")

    if data.name is not None:
        fleet.name = data.name.strip()
    if data.description is not None:
        fleet.description = data.description

    if data.items is not None:
        # Replace all items
        await db.execute(
            sa_delete(FleetItem).where(FleetItem.fleet_id == fleet.id)
        )
        for item in data.items:
            fi = FleetItem(fleet_id=fleet.id, vin=item.vin, count=item.count)
            db.add(fi)

    fleet.updated_at = datetime.utcnow()
    await db.commit()
    return {"status": "ok"}


@router.delete("/fleets/{fleet_id}")
async def delete_fleet(fleet_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a fleet."""
    result = await db.execute(select(Fleet).where(Fleet.id == fleet_id))
    fleet = result.scalars().first()
    if not fleet:
        raise HTTPException(404, "Fleet not found")
    await db.delete(fleet)
    await db.commit()
    return {"status": "deleted"}


@router.post("/fleets/compare")
async def compare_fleets(fleet_ids: list[str] = Body(...), db: AsyncSession = Depends(get_db)):
    """Compare multiple fleets side by side."""
    if len(fleet_ids) < 2:
        raise HTTPException(400, "Need at least 2 fleets to compare")

    comparisons = []
    for fid in fleet_ids:
        result = await db.execute(select(Fleet).where(Fleet.id == fid))
        fleet = result.scalars().first()
        if not fleet:
            continue
        items_q = await db.execute(
            select(FleetItem).where(FleetItem.fleet_id == fleet.id)
        )
        items = items_q.scalars().all()
        detail = await _build_fleet_detail(db, fleet, items)
        comparisons.append(detail)

    return comparisons


async def _build_fleet_detail(db: AsyncSession, fleet: Fleet, items: list[FleetItem]):
    """Build detailed fleet response with CO2 calculations."""
    # Get ALL non-summary VECTO results for CO2 calculations
    all_vecto = await db.execute(
        select(VectoResultCertified).where(VectoResultCertified.is_summary == False)
    )
    all_results = all_vecto.scalars().all()
    results_by_vin = {}
    for r in all_results:
        results_by_vin.setdefault(r.vin, []).append(r)

    # Get summary results for quick CO2 lookup
    sum_q = await db.execute(
        select(VectoResultCertified).where(VectoResultCertified.is_summary == True)
    )
    summary_by_vin = {}
    for r in sum_q.scalars().all():
        summary_by_vin[r.vin] = r

    total_vehicles = 0
    weighted_co2 = 0
    total_with_co2 = 0
    models_set = set()
    by_variant = []
    by_mission = {}  # mission|loading → {weighted_co2, count}
    by_model = {}    # model → {weighted_co2, count, vehicles}

    for it in items:
        count = it.count
        total_vehicles += count
        summary = summary_by_vin.get(it.vin)
        vin_results = results_by_vin.get(it.vin, [])

        # Get model and CO2: prefer summary, fall back to per-mission average
        if summary and summary.vehicle_model:
            model = summary.vehicle_model
        elif vin_results:
            model = vin_results[0].vehicle_model or ""
        else:
            model = ""

        if summary and summary.summary_co2_g_per_km:
            co2_val = float(summary.summary_co2_g_per_km)
        elif vin_results:
            co2_vals = [float(r.co2_g_per_km) for r in vin_results if r.co2_g_per_km]
            co2_val = round(sum(co2_vals) / len(co2_vals), 1) if co2_vals else None
        else:
            co2_val = None

        if summary and summary.summary_fc_l_per_100km:
            fc_val = float(summary.summary_fc_l_per_100km)
        elif vin_results:
            fc_vals = [float(r.fc_l_per_100km) for r in vin_results if r.fc_l_per_100km]
            fc_val = round(sum(fc_vals) / len(fc_vals), 1) if fc_vals else None
        else:
            fc_val = None

        if model:
            models_set.add(model)

        if co2_val and count > 0:
            weighted_co2 += co2_val * count
            total_with_co2 += count

        # Model aggregation
        if model:
            if model not in by_model:
                by_model[model] = {"weighted_co2": 0, "count": 0, "vehicles": 0}
            if co2_val:
                by_model[model]["weighted_co2"] += co2_val * count
                by_model[model]["count"] += count
            by_model[model]["vehicles"] += count

        # Mission breakdown from non-summary results
        for r in vin_results:
            co2 = float(r.co2_g_per_km) if r.co2_g_per_km else None
            if co2 and count > 0:
                mkey = f"{r.mission}|{r.loading}"
                if mkey not in by_mission:
                    by_mission[mkey] = {"mission": r.mission, "loading": r.loading, "weighted_co2": 0, "count": 0}
                by_mission[mkey]["weighted_co2"] += co2 * count
                by_mission[mkey]["count"] += count

        fleet_co2_total = round(co2_val * count, 1) if co2_val and count > 0 else None
        by_variant.append({
            "vin": it.vin,
            "count": count,
            "model": model,
            "co2": co2_val,
            "fc": fc_val,
            "fleet_co2_total": fleet_co2_total,
        })

    fleet_avg = round(weighted_co2 / total_with_co2, 1) if total_with_co2 > 0 else None

    # Contribution %
    for v in by_variant:
        if v["fleet_co2_total"] and weighted_co2 > 0:
            v["contribution_pct"] = round(v["fleet_co2_total"] / weighted_co2 * 100, 1)
        else:
            v["contribution_pct"] = None
    by_variant.sort(key=lambda x: x["fleet_co2_total"] or 0, reverse=True)

    # Mission results
    mission_list = []
    for mkey, d in by_mission.items():
        n = d["count"]
        mission_list.append({
            "mission": d["mission"],
            "loading": d["loading"],
            "fleet_avg_co2": round(d["weighted_co2"] / n, 1) if n > 0 else None,
            "total_vehicles": n,
        })
    mission_list.sort(key=lambda x: (x["mission"], x["loading"]))

    # Model breakdown
    model_list = []
    for m, d in by_model.items():
        model_list.append({
            "model": m,
            "vehicles": d["vehicles"],
            "avg_co2": round(d["weighted_co2"] / d["count"], 1) if d["count"] > 0 else None,
        })
    model_list.sort(key=lambda x: x["vehicles"], reverse=True)

    return {
        "id": str(fleet.id),
        "name": fleet.name,
        "description": fleet.description or "",
        "total_vehicles": total_vehicles,
        "variant_count": len(items),
        "models": sorted(models_set),
        "fleet_avg_co2": fleet_avg,
        "total_weighted_co2": round(weighted_co2, 1),
        "by_variant": by_variant,
        "by_mission": mission_list,
        "by_model": model_list,
        "created_at": fleet.created_at.isoformat() if fleet.created_at else None,
        "updated_at": fleet.updated_at.isoformat() if fleet.updated_at else None,
    }


def _calc_correlation_stats(pairs: list) -> dict:
    """Calculate R², MAPE, bias, RMSE for correlation pairs."""
    if not pairs:
        return {
            "total_pairs": 0,
            "r_squared": None,
            "mape_pct": None,
            "bias_g_km": None,
            "rmse_g_km": None,
            "quality": {"level": "no_data", "color": "#484f58", "note": "Henuz test verisi yok"},
        }

    import math
    n = len(pairs)
    vecto_vals = [p["vecto_co2"] for p in pairs]
    test_vals = [p["test_co2"] for p in pairs]
    diffs = [t - v for v, t in zip(vecto_vals, test_vals)]

    bias = sum(diffs) / n
    rmse = math.sqrt(sum(d ** 2 for d in diffs) / n)
    mape = sum(abs(d / v) * 100 for d, v in zip(diffs, vecto_vals) if v != 0) / n

    # R²
    mean_v = sum(vecto_vals) / n
    mean_t = sum(test_vals) / n
    ss_res = sum((t - v) ** 2 for v, t in zip(vecto_vals, test_vals))
    ss_tot = sum((t - mean_t) ** 2 for t in test_vals)
    r_sq = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0

    # Quality rating
    if r_sq > 0.9 and mape < 10:
        quality = {"level": "excellent", "color": "#3fb950", "note": "Mukemmel korelasyon"}
    elif r_sq > 0.7 and mape < 20:
        quality = {"level": "good", "color": "#58a6ff", "note": "Iyi korelasyon"}
    elif r_sq > 0.5:
        quality = {"level": "moderate", "color": "#d29922", "note": "Orta korelasyon — kalibrasyon onerilir"}
    else:
        quality = {"level": "poor", "color": "#f85149", "note": "Dusuk korelasyon — kalibrasyon gerekli"}

    return {
        "total_pairs": n,
        "r_squared": round(r_sq, 4),
        "mape_pct": round(mape, 2),
        "bias_g_km": round(bias, 1),
        "rmse_g_km": round(rmse, 1),
        "quality": quality,
    }


# ═══════════════════════════════════════════════════════════
# Benchmark — Compare variants by CO2
# ═══════════════════════════════════════════════════════════

@router.get("/benchmark")
async def get_benchmark(db: AsyncSession = Depends(get_db)):
    """
    Benchmark: compare all VINs/variants by CO2 per mission.
    Used for variant configuration comparison.
    """
    result = await db.execute(
        select(VectoResultCertified)
        .where(VectoResultCertified.is_summary == False)
        .order_by(VectoResultCertified.vehicle_model, VectoResultCertified.mission)
    )
    all_recs = result.scalars().all()

    # Build benchmark table: VIN × Mission
    benchmark = {}
    for r in all_recs:
        key = r.vin
        if key not in benchmark:
            benchmark[key] = {
                "vin": r.vin,
                "model": r.vehicle_model,
                "power_kw": float(r.engine_rated_power_kw) if r.engine_rated_power_kw else (float(r.total_propulsion_power_kw) if r.total_propulsion_power_kw else None),
                "mass_kg": float(r.corrected_actual_mass_kg) if r.corrected_actual_mass_kg else None,
                "axle_ratio": float(r.axle_ratio) if r.axle_ratio else None,
                "fuel_type": r.fuel_type,
                "missions": {},
            }
        mission_key = f"{r.mission}_{r.loading}"
        benchmark[key]["missions"][mission_key] = {
            "co2_g_km": float(r.co2_g_per_km) if r.co2_g_per_km else None,
            "co2_g_pkm": float(r.co2_g_per_pkm) if r.co2_g_per_pkm else None,
            "fc_l_100km": float(r.fc_l_per_100km) if r.fc_l_per_100km else None,
            "fc_l_pkm": float(r.fc_l_per_pkm) if r.fc_l_per_pkm else None,
            "fc_g_km": float(r.fc_g_per_km) if r.fc_g_per_km else None,
            "fc_g_pkm": float(r.fc_g_per_pkm) if r.fc_g_per_pkm else None,
            "fc_mj_km": float(r.fc_mj_per_km) if r.fc_mj_per_km else None,
            "fc_mj_pkm": float(r.fc_mj_per_pkm) if r.fc_mj_per_pkm else None,
            "avg_speed": float(r.avg_speed_kmh) if r.avg_speed_kmh else None,
            "passengers": float(r.passenger_count) if r.passenger_count else None,
            "mass_passengers_kg": float(r.mass_passengers_kg) if r.mass_passengers_kg else None,
            "total_mass_kg": float(r.total_vehicle_mass_kg) if r.total_vehicle_mass_kg else None,
        }

    return {
        "total_vehicles": len(benchmark),
        "vehicles": list(benchmark.values()),
    }


@router.get("/vecto-results")
async def get_vecto_results(db: AsyncSession = Depends(get_db)):
    """Get all imported VECTO certified results."""
    result = await db.execute(
        select(VectoResultCertified)
        .order_by(VectoResultCertified.vin, VectoResultCertified.mission)
    )
    recs = result.scalars().all()

    return {
        "total": len(recs),
        "results": [
            {
                "id": str(r.id),
                "vin": r.vin,
                "model": r.vehicle_model,
                "mission": r.mission,
                "loading": r.loading,
                "status": r.status or "success",
                "fuel_type": r.fuel_type,
                "is_summary": r.is_summary or False,
                "co2_g_km": float(r.co2_g_per_km) if r.co2_g_per_km else None,
                "co2_g_pkm": float(r.co2_g_per_pkm) if r.co2_g_per_pkm else None,
                "fc_l_100km": float(r.fc_l_per_100km) if r.fc_l_per_100km else None,
                "fc_l_pkm": float(r.fc_l_per_pkm) if r.fc_l_per_pkm else None,
                "fc_g_km": float(r.fc_g_per_km) if r.fc_g_per_km else None,
                "fc_g_pkm": float(r.fc_g_per_pkm) if r.fc_g_per_pkm else None,
                "fc_mj_km": float(r.fc_mj_per_km) if r.fc_mj_per_km else None,
                "fc_mj_pkm": float(r.fc_mj_per_pkm) if r.fc_mj_per_pkm else None,
                "avg_speed": float(r.avg_speed_kmh) if r.avg_speed_kmh else None,
                "passengers": float(r.passenger_count) if r.passenger_count else None,
                "mass_passengers_kg": float(r.mass_passengers_kg) if r.mass_passengers_kg else None,
                "total_mass_kg": float(r.total_vehicle_mass_kg) if r.total_vehicle_mass_kg else None,
                "source_file": r.source_file,
                "source_type": r.source_type,
                "simulation_date": r.simulation_date.isoformat() if r.simulation_date else None,
            }
            for r in recs
        ],
    }


# ═══════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════

async def _match_variant(db: AsyncSession, veh_info: dict) -> UUID | None:
    """Try to match a VECTO result to an existing variant in our DB."""
    model = veh_info.get("model")
    power = veh_info.get("total_propulsion_power_kw") or veh_info.get("engine_rated_power_kw")
    mass = veh_info.get("tech_max_laden_mass_kg")

    if not model:
        return None

    # Try matching by model name + power
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .where(Vehicle.model_name == model)
    )
    rows = result.all()

    if not rows:
        # Try fuzzy: model name contains
        result = await db.execute(
            select(VehicleVariant, Vehicle)
            .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
            .where(Vehicle.model_name.ilike(f"%{model}%"))
        )
        rows = result.all()

    if not rows:
        return None

    # If power matches, prefer that
    if power:
        for v, veh in rows:
            if v.rated_power_w and abs(v.rated_power_w / 1000 - power) < 5:
                return v.id

    # Return first match
    return rows[0][0].id


async def _match_variant_by_code(db: AsyncSession, variant_code: str) -> UUID | None:
    """Try to match a variant by its variant_code (filename-based)."""
    result = await db.execute(
        select(VehicleVariant.id)
        .where(VehicleVariant.variant_code == variant_code)
    )
    row = result.first()
    return row[0] if row else None
