"""CO2 Emissions & Virtual Testing API endpoints."""
import math
import os
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import (
    Vehicle, VehicleVariant, FuelConsumptionMap,
    FullLoadDragCurve, GearRatio, VectoSimulationOutput,
)
from app.services.co2_engine import (
    calculate_co2_estimates,
    calculate_bsfc_map,
    find_optimal_operating_point,
    predict_virtual_variant,
)
from app.services.correlation_engine import calculate_correlation
from app.services.vecto_output_parser import parse_manufacturer_xml, parse_vsum_file

router = APIRouter(prefix="/api/v1/co2", tags=["CO2 & Virtual Testing"])


@router.get("/fleet-emissions")
async def get_fleet_emissions(db: AsyncSession = Depends(get_db)):
    """
    Calculate CO2 emissions for entire fleet.
    Returns per-variant and aggregated fleet CO2 data.
    """
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .order_by(Vehicle.model_name)
    )
    rows = result.all()

    fleet_data = []
    model_aggregates = {}

    for v, veh in rows:
        # Get fuel map
        fm_result = await db.execute(
            select(FuelConsumptionMap)
            .where(FuelConsumptionMap.variant_id == v.id)
            .order_by(FuelConsumptionMap.engine_speed)
        )
        fm_points = [
            {"engine_speed": float(r.engine_speed), "torque": float(r.torque), "fuel_consumption": float(r.fuel_consumption)}
            for r in fm_result.scalars().all()
        ]

        if not fm_points:
            continue

        co2 = calculate_co2_estimates(
            fuel_map_points=fm_points,
            rated_power_w=v.rated_power_w,
            max_laden_mass_kg=v.max_laden_mass_kg,
            whtc_urban=float(v.whtc_urban) if v.whtc_urban else None,
            whtc_rural=float(v.whtc_rural) if v.whtc_rural else None,
            whtc_motorway=float(v.whtc_motorway) if v.whtc_motorway else None,
            bf_cold_hot=float(v.bf_cold_hot) if v.bf_cold_hot else None,
            cf_reg_per=float(v.cf_reg_per) if v.cf_reg_per else None,
            cf_ncv=float(v.cf_ncv) if v.cf_ncv else None,
            rrc_declared=float(v.rrc_declared) if v.rrc_declared else None,
        )

        if "error" in co2:
            continue

        entry = {
            "variant_id": str(v.id),
            "variant_code": v.variant_code,
            "model_name": veh.model_name,
            "category": str(veh.category),
            "engine_type": str(v.engine_type),
            "power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
            "mass_kg": v.max_laden_mass_kg,
            "co2_urban": co2["co2_urban"],
            "co2_rural": co2["co2_rural"],
            "co2_motorway": co2["co2_motorway"],
            "co2_weighted": co2["co2_weighted"],
            "fuel_l_100km": co2["fuel_l_100km_weighted"],
            "bsfc_optimal": co2["optimal_point"]["bsfc_g_kwh"],
            "correction_factors_from_xml": co2["correction_factors"]["has_xml_data"],
        }
        fleet_data.append(entry)

        # Aggregate by model
        mn = veh.model_name
        if mn not in model_aggregates:
            model_aggregates[mn] = {
                "model_name": mn,
                "category": str(veh.category),
                "variants": [],
                "co2_values": [],
                "fuel_values": [],
                "bsfc_values": [],
            }
        model_aggregates[mn]["variants"].append(entry)
        model_aggregates[mn]["co2_values"].append(co2["co2_weighted"])
        model_aggregates[mn]["fuel_values"].append(co2["fuel_l_100km_weighted"])
        if co2["optimal_point"]["bsfc_g_kwh"]:
            model_aggregates[mn]["bsfc_values"].append(co2["optimal_point"]["bsfc_g_kwh"])

    # Compute model summaries
    model_summary = []
    for mn, agg in model_aggregates.items():
        co2_vals = agg["co2_values"]
        fuel_vals = agg["fuel_values"]
        bsfc_vals = agg["bsfc_values"]
        model_summary.append({
            "model_name": mn,
            "category": agg["category"],
            "variant_count": len(agg["variants"]),
            "co2_avg": round(sum(co2_vals) / len(co2_vals), 1) if co2_vals else None,
            "co2_min": round(min(co2_vals), 1) if co2_vals else None,
            "co2_max": round(max(co2_vals), 1) if co2_vals else None,
            "co2_spread": round(max(co2_vals) - min(co2_vals), 1) if len(co2_vals) > 1 else 0,
            "fuel_avg": round(sum(fuel_vals) / len(fuel_vals), 2) if fuel_vals else None,
            "bsfc_best": round(min(bsfc_vals), 1) if bsfc_vals else None,
        })
    model_summary.sort(key=lambda x: x["co2_avg"] or 9999)

    # Fleet totals
    all_co2 = [e["co2_weighted"] for e in fleet_data if e["co2_weighted"]]
    all_fuel = [e["fuel_l_100km"] for e in fleet_data if e["fuel_l_100km"]]

    fleet_summary = {
        "total_variants_analyzed": len(fleet_data),
        "fleet_co2_avg": round(sum(all_co2) / len(all_co2), 1) if all_co2 else None,
        "fleet_co2_min": round(min(all_co2), 1) if all_co2 else None,
        "fleet_co2_max": round(max(all_co2), 1) if all_co2 else None,
        "fleet_fuel_avg": round(sum(all_fuel) / len(all_fuel), 2) if all_fuel else None,
        "best_variant": min(fleet_data, key=lambda x: x["co2_weighted"]) if fleet_data else None,
        "worst_variant": max(fleet_data, key=lambda x: x["co2_weighted"]) if fleet_data else None,
    }

    # Category breakdown
    cat_data = {}
    for e in fleet_data:
        cat = e["category"]
        if cat not in cat_data:
            cat_data[cat] = []
        cat_data[cat].append(e["co2_weighted"])
    category_breakdown = [
        {
            "category": cat,
            "count": len(vals),
            "co2_avg": round(sum(vals) / len(vals), 1),
            "co2_min": round(min(vals), 1),
            "co2_max": round(max(vals), 1),
        }
        for cat, vals in cat_data.items()
    ]

    return {
        "fleet_summary": fleet_summary,
        "model_summary": model_summary,
        "category_breakdown": category_breakdown,
        "variants": fleet_data,
    }


@router.get("/variant/{variant_id}")
async def get_variant_co2(variant_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get detailed CO2 analysis for a single variant."""
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .where(VehicleVariant.id == variant_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Variant not found")
    v, veh = row

    fm_result = await db.execute(
        select(FuelConsumptionMap)
        .where(FuelConsumptionMap.variant_id == v.id)
        .order_by(FuelConsumptionMap.engine_speed, FuelConsumptionMap.torque)
    )
    fm_points = [
        {"engine_speed": float(r.engine_speed), "torque": float(r.torque), "fuel_consumption": float(r.fuel_consumption)}
        for r in fm_result.scalars().all()
    ]

    co2 = calculate_co2_estimates(
        fuel_map_points=fm_points,
        rated_power_w=v.rated_power_w,
        max_laden_mass_kg=v.max_laden_mass_kg,
        whtc_urban=float(v.whtc_urban) if v.whtc_urban else None,
        whtc_rural=float(v.whtc_rural) if v.whtc_rural else None,
        whtc_motorway=float(v.whtc_motorway) if v.whtc_motorway else None,
        bf_cold_hot=float(v.bf_cold_hot) if v.bf_cold_hot else None,
        cf_reg_per=float(v.cf_reg_per) if v.cf_reg_per else None,
        cf_ncv=float(v.cf_ncv) if v.cf_ncv else None,
        rrc_declared=float(v.rrc_declared) if v.rrc_declared else None,
    )

    # BSFC map for visualization
    bsfc_map = calculate_bsfc_map(fm_points)

    # Get unique RPMs and build efficiency contour data
    rpms = sorted(set(p["rpm"] for p in bsfc_map))
    torques = sorted(set(p["torque"] for p in bsfc_map))

    return {
        "variant_id": str(v.id),
        "model_name": veh.model_name,
        "variant_code": v.variant_code,
        "power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
        "mass_kg": v.max_laden_mass_kg,
        "engine": f"{v.engine_manufacturer} {v.engine_model}",
        "co2": co2,
        "bsfc_map": bsfc_map,
        "rpms": rpms,
        "torques": torques,
    }


class VirtualTestRequest(BaseModel):
    base_variant_id: str
    target_power_kw: float
    target_mass_kg: int
    target_axle_ratio: Optional[float] = None


@router.get("/virtual-test-options")
async def get_virtual_test_options(db: AsyncSession = Depends(get_db)):
    """
    Get available configurations for virtual testing.
    Returns distinct engines, gearboxes, axle ratios, and masses found in fleet.
    """
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    rows = result.all()

    engines = {}
    gearboxes = {}
    axle_ratios = set()
    masses = set()
    tyres = set()
    variants_for_base = []

    for v, veh in rows:
        # Engines
        eng_key = f"{v.engine_manufacturer} {v.engine_model}"
        if eng_key not in engines:
            engines[eng_key] = {
                "key": eng_key,
                "manufacturer": v.engine_manufacturer,
                "model": v.engine_model,
                "power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
                "torque_nm": float(v.max_torque_nm) if v.max_torque_nm else None,
                "displacement_cc": v.displacement_cc,
                "count": 0,
            }
        engines[eng_key]["count"] += 1

        # Gearboxes
        gb_key = f"{v.gearbox_manufacturer} {v.gearbox_model}"
        if gb_key not in gearboxes:
            gearboxes[gb_key] = {
                "key": gb_key,
                "manufacturer": v.gearbox_manufacturer,
                "model": v.gearbox_model,
                "type": v.gearbox_type,
                "gear_count": v.gear_count,
                "count": 0,
            }
        gearboxes[gb_key]["count"] += 1

        if v.axle_ratio:
            axle_ratios.add(float(v.axle_ratio))
        if v.max_laden_mass_kg:
            masses.add(v.max_laden_mass_kg)
        if v.tyre_dimension:
            tyres.add(v.tyre_dimension)

        variants_for_base.append({
            "id": str(v.id),
            "model_name": veh.model_name,
            "variant_code": v.variant_code,
            "power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
            "mass_kg": v.max_laden_mass_kg,
            "engine": eng_key,
            "gearbox": gb_key,
        })

    return {
        "engines": list(engines.values()),
        "gearboxes": list(gearboxes.values()),
        "axle_ratios": sorted(axle_ratios),
        "masses": sorted(masses),
        "tyres": sorted(tyres),
        "base_variants": variants_for_base,
    }


@router.post("/virtual-test")
async def run_virtual_test(req: VirtualTestRequest, db: AsyncSession = Depends(get_db)):
    """
    Run a virtual test: predict CO2 for an untested configuration
    by scaling from a tested base variant's fuel map.
    """
    # Load base variant
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
        .where(VehicleVariant.id == req.base_variant_id)
    )
    row = result.one_or_none()
    if not row:
        raise HTTPException(404, "Base variant not found")
    v, veh = row

    # Load fuel map
    fm_result = await db.execute(
        select(FuelConsumptionMap)
        .where(FuelConsumptionMap.variant_id == v.id)
        .order_by(FuelConsumptionMap.engine_speed, FuelConsumptionMap.torque)
    )
    fm_points = [
        {"engine_speed": float(r.engine_speed), "torque": float(r.torque), "fuel_consumption": float(r.fuel_consumption)}
        for r in fm_result.scalars().all()
    ]

    if not fm_points:
        raise HTTPException(400, "Base variant has no fuel map data")

    # Also calculate base CO2 for comparison
    base_co2 = calculate_co2_estimates(
        fuel_map_points=fm_points,
        rated_power_w=v.rated_power_w,
        max_laden_mass_kg=v.max_laden_mass_kg,
        whtc_urban=float(v.whtc_urban) if v.whtc_urban else None,
        whtc_rural=float(v.whtc_rural) if v.whtc_rural else None,
        whtc_motorway=float(v.whtc_motorway) if v.whtc_motorway else None,
    )

    # Run virtual prediction
    whtc_factors = {}
    if v.whtc_urban:
        whtc_factors["urban"] = float(v.whtc_urban)
    if v.whtc_rural:
        whtc_factors["rural"] = float(v.whtc_rural)
    if v.whtc_motorway:
        whtc_factors["motorway"] = float(v.whtc_motorway)
    if v.bf_cold_hot:
        whtc_factors["bf_cold_hot"] = float(v.bf_cold_hot)
    if v.cf_reg_per:
        whtc_factors["cf_reg_per"] = float(v.cf_reg_per)
    if v.cf_ncv:
        whtc_factors["cf_ncv"] = float(v.cf_ncv)

    virtual_co2 = predict_virtual_variant(
        base_fuel_map=fm_points,
        base_power_w=v.rated_power_w,
        base_mass_kg=v.max_laden_mass_kg,
        target_power_w=int(req.target_power_kw * 1000),
        target_mass_kg=req.target_mass_kg,
        target_axle_ratio=req.target_axle_ratio,
        base_axle_ratio=float(v.axle_ratio) if v.axle_ratio else None,
        whtc_factors=whtc_factors or None,
    )

    # Delta analysis
    delta = {}
    if base_co2.get("co2_weighted") and virtual_co2.get("co2_weighted"):
        delta = {
            "co2_change_g_km": round(virtual_co2["co2_weighted"] - base_co2["co2_weighted"], 1),
            "co2_change_pct": round((virtual_co2["co2_weighted"] - base_co2["co2_weighted"]) / base_co2["co2_weighted"] * 100, 1),
            "fuel_change_l_100km": round(virtual_co2["fuel_l_100km_weighted"] - base_co2["fuel_l_100km_weighted"], 2),
        }

    return {
        "base": {
            "variant_id": str(v.id),
            "model_name": veh.model_name,
            "variant_code": v.variant_code,
            "power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
            "mass_kg": v.max_laden_mass_kg,
            "co2": base_co2,
        },
        "virtual": virtual_co2,
        "delta": delta,
        "test_savings_note": "Bu sanal test, fiziksel VECTO testine gerek kalmadan tahmin uretir. "
                             "Tahmini maliyet tasarrufu: ~15.000-25.000 EUR/test.",
    }


# ── VECTO Output Import ──

@router.post("/import-vecto-outputs")
async def import_vecto_outputs(
    directory: str = Query(..., description="Path to folder with RSLT_MANUFACTURER.xml or .vsum files"),
    db: AsyncSession = Depends(get_db),
):
    """Import VECTO simulation result files from a directory (network share or local)."""
    import glob
    import logging
    logger = logging.getLogger(__name__)

    if not os.path.isdir(directory):
        raise HTTPException(400, f"Directory not found: {directory}")

    # Find all RSLT_MANUFACTURER.xml and .vsum files recursively
    rslt_files = glob.glob(os.path.join(directory, "**", "*RSLT_MANUFACTURER.xml"), recursive=True)
    vsum_files = glob.glob(os.path.join(directory, "**", "*.vsum"), recursive=True)

    # Filter: prefer "Complete vehicle" versions (smaller, cleaner)
    complete_rslt = [f for f in rslt_files if "Complete vehicle" in f or "Complete input" in f]
    primary_rslt = [f for f in rslt_files if "Primary input" in f or "Primary" in f.split(os.sep)[-2]]
    # Use complete if available, otherwise primary
    chosen_rslt = complete_rslt or primary_rslt or rslt_files

    imported = 0
    errors = []

    for filepath in chosen_rslt:
        try:
            results = parse_manufacturer_xml(filepath)
            for r in results:
                out = VectoSimulationOutput(
                    vin=r.get("vin", "UNKNOWN"),
                    vehicle_model=r.get("vehicle_model"),
                    vehicle_group=r.get("vehicle_group"),
                    mission=r.get("mission", "Unknown"),
                    loading=r.get("loading", "Unknown"),
                    primary_subgroup=r.get("primary_subgroup"),
                    co2_g_per_km=r.get("co2_g_per_km"),
                    co2_g_per_pkm=r.get("co2_g_per_pkm"),
                    fc_g_per_km=r.get("fc_g_per_km"),
                    fc_l_per_100km=r.get("fc_l_per_100km"),
                    fc_mj_per_km=r.get("fc_mj_per_km"),
                    total_vehicle_mass_kg=r.get("total_vehicle_mass_kg"),
                    payload_kg=r.get("payload_kg"),
                    passenger_count=r.get("passenger_count"),
                    corrected_actual_mass_kg=r.get("corrected_actual_mass_kg"),
                    avg_speed_kmh=r.get("avg_speed_kmh"),
                    avg_driving_speed_kmh=r.get("avg_driving_speed_kmh"),
                    max_speed_kmh=r.get("max_speed_kmh"),
                    gearbox_efficiency_pct=r.get("gearbox_efficiency_pct"),
                    axlegear_efficiency_pct=r.get("axlegear_efficiency_pct"),
                    gearshift_count=r.get("gearshift_count"),
                    source_file=filepath,
                    status=r.get("status", "success"),
                )
                db.add(out)
                imported += 1
        except Exception as e:
            errors.append({"file": filepath, "error": str(e)})
            logger.error(f"Failed to import {filepath}: {e}")

    # Also parse vsum files (richer data with WHTC factors)
    # Use "Primary input" vsum - it has more detailed per-run data
    primary_vsum = [f for f in vsum_files if "Primary" in f.split(os.sep)[-2]]
    chosen_vsum = primary_vsum or vsum_files

    for filepath in chosen_vsum:
        try:
            results = parse_vsum_file(filepath)
            for r in results:
                out = VectoSimulationOutput(
                    vin=r.get("vin", "UNKNOWN"),
                    vehicle_model=r.get("vehicle_model"),
                    vehicle_group=r.get("vehicle_group"),
                    mission=r.get("mission", "Unknown"),
                    loading=r.get("loading", "Unknown"),
                    co2_g_per_km=r.get("co2_g_per_km"),
                    co2_g_per_pkm=r.get("co2_g_per_pkm"),
                    fc_g_per_km=r.get("fc_g_per_km"),
                    fc_l_per_100km=r.get("fc_l_per_100km"),
                    total_vehicle_mass_kg=r.get("total_vehicle_mass_kg"),
                    payload_kg=r.get("payload_kg"),
                    passenger_count=r.get("passenger_count"),
                    corrected_actual_mass_kg=r.get("corrected_actual_mass_kg"),
                    avg_speed_kmh=r.get("avg_speed_kmh"),
                    max_speed_kmh=r.get("max_speed_kmh"),
                    gearshift_count=r.get("gearshift_count"),
                    engine_rated_power_kw=r.get("engine_rated_power_kw"),
                    engine_displacement_cc=r.get("engine_displacement_cc"),
                    axle_ratio=r.get("axle_ratio"),
                    whtc_urban=r.get("whtc_urban"),
                    whtc_rural=r.get("whtc_rural"),
                    whtc_motorway=r.get("whtc_motorway"),
                    bf_cold_hot=r.get("bf_cold_hot"),
                    cf_reg_per=r.get("cf_reg_per"),
                    cf_actual=r.get("cf_actual"),
                    source_file=filepath,
                    status=r.get("status", "success"),
                )
                db.add(out)
                imported += 1
        except Exception as e:
            errors.append({"file": filepath, "error": str(e)})
            logger.error(f"Failed to import vsum {filepath}: {e}")

    await db.commit()

    return {
        "imported_results": imported,
        "rslt_files_processed": len(chosen_rslt),
        "vsum_files_processed": len(chosen_vsum),
        "errors": errors,
    }


# ── Correlation Analysis ──

@router.get("/correlation")
async def get_correlation_analysis(db: AsyncSession = Depends(get_db)):
    """
    Compare Digital Twin CO2 estimates with real VECTO simulation results.
    This is the 'korelasyon' — the most critical validation metric.
    """
    # 1. Get twin estimates (same as fleet-emissions)
    result = await db.execute(
        select(VehicleVariant, Vehicle)
        .join(Vehicle, Vehicle.id == VehicleVariant.vehicle_id)
    )
    rows = result.all()

    twin_estimates = []
    for v, veh in rows:
        fm_result = await db.execute(
            select(FuelConsumptionMap)
            .where(FuelConsumptionMap.variant_id == v.id)
        )
        fm_points = [
            {"engine_speed": float(r.engine_speed), "torque": float(r.torque), "fuel_consumption": float(r.fuel_consumption)}
            for r in fm_result.scalars().all()
        ]
        if not fm_points:
            continue

        co2 = calculate_co2_estimates(
            fuel_map_points=fm_points,
            rated_power_w=v.rated_power_w,
            max_laden_mass_kg=v.max_laden_mass_kg,
            whtc_urban=float(v.whtc_urban) if v.whtc_urban else None,
            whtc_rural=float(v.whtc_rural) if v.whtc_rural else None,
            whtc_motorway=float(v.whtc_motorway) if v.whtc_motorway else None,
            bf_cold_hot=float(v.bf_cold_hot) if v.bf_cold_hot else None,
            cf_reg_per=float(v.cf_reg_per) if v.cf_reg_per else None,
            cf_ncv=float(v.cf_ncv) if v.cf_ncv else None,
            rrc_declared=float(v.rrc_declared) if v.rrc_declared else None,
        )
        if "error" not in co2:
            twin_estimates.append({
                "variant_code": v.variant_code,
                "model_name": veh.model_name,
                "category": str(veh.category),
                "power_kw": round(v.rated_power_w / 1000, 1) if v.rated_power_w else None,
                "mass_kg": v.max_laden_mass_kg,
                "co2_weighted": co2["co2_weighted"],
                "fuel_l_100km": co2["fuel_l_100km_weighted"],
                "co2_urban": co2["co2_urban"],
                "co2_rural": co2["co2_rural"],
                "co2_motorway": co2["co2_motorway"],
            })

    # 2. Get real VECTO simulation outputs
    vecto_result = await db.execute(select(VectoSimulationOutput))
    vecto_outputs = vecto_result.scalars().all()

    vecto_results = []
    for vo in vecto_outputs:
        vecto_results.append({
            "vin": vo.vin,
            "vehicle_model": vo.vehicle_model,
            "vehicle_group": vo.vehicle_group,
            "mission": vo.mission,
            "loading": vo.loading,
            "co2_g_per_km": float(vo.co2_g_per_km) if vo.co2_g_per_km else None,
            "co2_g_per_pkm": float(vo.co2_g_per_pkm) if vo.co2_g_per_pkm else None,
            "fc_l_per_100km": float(vo.fc_l_per_100km) if vo.fc_l_per_100km else None,
            "fc_g_per_km": float(vo.fc_g_per_km) if vo.fc_g_per_km else None,
            "corrected_actual_mass_kg": float(vo.corrected_actual_mass_kg) if vo.corrected_actual_mass_kg else None,
            "total_vehicle_mass_kg": float(vo.total_vehicle_mass_kg) if vo.total_vehicle_mass_kg else None,
            "engine_rated_power_kw": float(vo.engine_rated_power_kw) if vo.engine_rated_power_kw else None,
            "avg_speed_kmh": float(vo.avg_speed_kmh) if vo.avg_speed_kmh else None,
        })

    # 3. Run correlation
    correlation = calculate_correlation(twin_estimates, vecto_results)

    correlation["data_info"] = {
        "twin_variants": len(twin_estimates),
        "vecto_simulations": len(vecto_results),
        "vecto_vins": len(set(vo.vin for vo in vecto_outputs)),
    }

    return correlation


@router.get("/vecto-outputs")
async def get_vecto_outputs(db: AsyncSession = Depends(get_db)):
    """Get all imported VECTO simulation outputs."""
    result = await db.execute(
        select(VectoSimulationOutput).order_by(VectoSimulationOutput.vin, VectoSimulationOutput.mission)
    )
    outputs = result.scalars().all()

    return {
        "total": len(outputs),
        "outputs": [
            {
                "id": str(o.id),
                "vin": o.vin,
                "vehicle_model": o.vehicle_model,
                "mission": o.mission,
                "loading": o.loading,
                "co2_g_per_km": float(o.co2_g_per_km) if o.co2_g_per_km else None,
                "fc_l_per_100km": float(o.fc_l_per_100km) if o.fc_l_per_100km else None,
                "avg_speed_kmh": float(o.avg_speed_kmh) if o.avg_speed_kmh else None,
                "total_mass_kg": float(o.total_vehicle_mass_kg) if o.total_vehicle_mass_kg else None,
                "source_file": o.source_file,
            }
            for o in outputs
        ],
    }
