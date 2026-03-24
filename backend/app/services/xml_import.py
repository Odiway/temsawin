"""
XML Import Service — Imports VECTO XML files into the database.
Handles single file and bulk directory imports.
"""
import os
import logging
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Vehicle, VehicleVariant, FuelConsumptionMap, FullLoadDragCurve,
    GearRatio, TorqueConverterChar, AxleLossMap, ImportLog,
)
from app.services.vecto_parser import parse_vecto_xml

logger = logging.getLogger(__name__)


async def import_single_xml(db: AsyncSession, filepath: str) -> dict:
    """Import a single VECTO XML file. Returns import result dict."""
    filename = os.path.basename(filepath)
    variant_code = Path(filepath).stem

    try:
        # Check if already imported
        existing = await db.execute(
            select(VehicleVariant).where(VehicleVariant.variant_code == variant_code)
        )
        if existing.scalar_one_or_none():
            return {
                "filename": filename,
                "status": "skipped",
                "variant_code": variant_code,
                "message": "Already imported",
            }

        # Parse XML
        parsed = parse_vecto_xml(filepath)
        veh_data = parsed["vehicle"]
        var_data = parsed["variant"]

        # Find or create vehicle
        vehicle = await _get_or_create_vehicle(db, veh_data)

        # Create variant
        variant = VehicleVariant(
            vehicle_id=vehicle.id,
            **var_data,
        )
        db.add(variant)
        await db.flush()

        counts = {"fuel_map": 0, "load_curves": 0, "gear_ratios": 0, "torque_converter": 0, "axle_losses": 0}

        # Fuel consumption map entries
        for entry in parsed["fuel_map"]:
            db.add(FuelConsumptionMap(variant_id=variant.id, **entry))
            counts["fuel_map"] += 1

        # Full load drag curves
        for entry in parsed["load_curves"]:
            db.add(FullLoadDragCurve(variant_id=variant.id, **entry))
            counts["load_curves"] += 1

        # Gear ratios
        for entry in parsed["gear_ratios"]:
            db.add(GearRatio(variant_id=variant.id, **entry))
            counts["gear_ratios"] += 1

        # Torque converter
        for entry in parsed["torque_converter"]:
            db.add(TorqueConverterChar(variant_id=variant.id, **entry))
            counts["torque_converter"] += 1

        # Axle losses
        for entry in parsed["axle_losses"]:
            db.add(AxleLossMap(variant_id=variant.id, **entry))
            counts["axle_losses"] += 1

        # Import log
        log = ImportLog(
            filename=filename,
            status="success",
            vehicle_model=veh_data["model_name"],
            variant_code=variant_code,
            variant_id=variant.id,
            record_counts=counts,
        )
        db.add(log)
        await db.commit()

        logger.info(f"Imported {filename}: {veh_data['model_name']} / {variant_code} — {counts}")

        return {
            "filename": filename,
            "status": "success",
            "vehicle_model": veh_data["model_name"],
            "variant_code": variant_code,
            "variant_id": str(variant.id),
            "message": f"Imported successfully ({counts['fuel_map']} FCM, {counts['load_curves']} FLDC, {counts['gear_ratios']} gears)",
            "record_counts": counts,
        }

    except Exception as e:
        await db.rollback()
        logger.error(f"Error importing {filename}: {e}")

        # Log the error
        log = ImportLog(
            filename=filename,
            status="error",
            variant_code=variant_code,
            error_message=str(e),
        )
        db.add(log)
        await db.commit()

        return {
            "filename": filename,
            "status": "error",
            "variant_code": variant_code,
            "message": str(e),
        }


async def import_directory(db: AsyncSession, directory: str) -> dict:
    """Import all XML files from a directory."""
    xml_files = sorted(Path(directory).glob("*.xml"))

    results = []
    success = 0
    errors = 0

    for xml_path in xml_files:
        result = await import_single_xml(db, str(xml_path))
        results.append(result)
        if result["status"] == "success":
            success += 1
        elif result["status"] == "error":
            errors += 1

    return {
        "total_files": len(xml_files),
        "success_count": success,
        "error_count": errors,
        "skipped_count": len(xml_files) - success - errors,
        "results": results,
    }


async def _get_or_create_vehicle(db: AsyncSession, veh_data: dict) -> Vehicle:
    """Find existing vehicle by model_name or create new one."""
    result = await db.execute(
        select(Vehicle).where(Vehicle.model_name == veh_data["model_name"])
    )
    vehicle = result.scalar_one_or_none()

    if vehicle is None:
        vehicle = Vehicle(**veh_data)
        db.add(vehicle)
        await db.flush()

    return vehicle
