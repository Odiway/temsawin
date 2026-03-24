"""Simulation and import endpoints."""
import os
import shutil
import tempfile
from uuid import UUID
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app.models import Vehicle, VehicleVariant, ImportLog
from app.services.xml_import import import_single_xml, import_directory
from app.schemas import ImportResult, BulkImportResult, DashboardStats

router = APIRouter(prefix="/api/v1", tags=["Simulations & Import"])


# ── Upload single XML ──
@router.post("/import/upload", response_model=ImportResult)
async def upload_xml(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename.endswith(".xml"):
        raise HTTPException(400, "Only XML files are accepted")

    # Save to import dir
    import_dir = settings.VECTO_IMPORT_DIR
    os.makedirs(import_dir, exist_ok=True)
    filepath = os.path.join(import_dir, file.filename)

    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    result = await import_single_xml(db, filepath)
    return result


# ── Upload multiple XMLs ──
@router.post("/import/upload-bulk")
async def upload_bulk_xml(
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    import_dir = settings.VECTO_IMPORT_DIR
    os.makedirs(import_dir, exist_ok=True)

    results = []
    success = 0
    errors = 0

    for file in files:
        if not file.filename.endswith(".xml"):
            results.append({"filename": file.filename, "status": "error", "message": "Not an XML file"})
            errors += 1
            continue

        filepath = os.path.join(import_dir, file.filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)

        result = await import_single_xml(db, filepath)
        results.append(result)
        if result["status"] == "success":
            success += 1
        elif result["status"] == "error":
            errors += 1

    return {
        "total_files": len(files),
        "success_count": success,
        "error_count": errors,
        "results": results,
    }


# ── Import from server directory ──
@router.post("/import/directory")
async def import_from_directory(
    directory: str = Query(..., description="Server-side directory path"),
    db: AsyncSession = Depends(get_db),
):
    if not os.path.isdir(directory):
        raise HTTPException(400, f"Directory not found: {directory}")

    result = await import_directory(db, directory)
    return result


# ── Import logs ──
@router.get("/import/logs")
async def get_import_logs(
    limit: int = Query(50, ge=1, le=500),
    status: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(ImportLog).order_by(ImportLog.imported_at.desc()).limit(limit)
    if status:
        query = query.where(ImportLog.status == status)

    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        {c.key: getattr(log, c.key) for c in ImportLog.__table__.columns}
        for log in logs
    ]


# ── Dashboard Stats ──
@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Total vehicles
    veh_count = await db.execute(select(func.count()).select_from(Vehicle))
    total_vehicles = veh_count.scalar() or 0

    # Total variants
    var_count = await db.execute(select(func.count()).select_from(VehicleVariant))
    total_variants = var_count.scalar() or 0

    # Variants by category
    cat_result = await db.execute(
        select(Vehicle.category, func.count(VehicleVariant.id))
        .join(VehicleVariant, Vehicle.id == VehicleVariant.vehicle_id)
        .group_by(Vehicle.category)
    )
    by_category = {str(row[0]): row[1] for row in cat_result.all()}

    # Variants by engine type
    eng_result = await db.execute(
        select(VehicleVariant.engine_type, func.count(VehicleVariant.id))
        .group_by(VehicleVariant.engine_type)
    )
    by_engine = {str(row[0]): row[1] for row in eng_result.all()}

    # Recent imports
    logs_result = await db.execute(
        select(ImportLog).order_by(ImportLog.imported_at.desc()).limit(10)
    )
    recent = [
        {
            "filename": log.filename,
            "status": log.status,
            "vehicle_model": log.vehicle_model,
            "variant_code": log.variant_code,
            "imported_at": str(log.imported_at) if log.imported_at else None,
        }
        for log in logs_result.scalars().all()
    ]

    return {
        "total_vehicles": total_vehicles,
        "total_variants": total_variants,
        "total_simulations": 0,
        "variants_by_category": by_category,
        "variants_by_engine_type": by_engine,
        "recent_imports": recent,
    }
