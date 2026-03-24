"""Vehicle & Variant CRUD endpoints."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Vehicle, VehicleVariant, FuelConsumptionMap, FullLoadDragCurve, GearRatio
from app.schemas import (
    VehicleCreate, VehicleResponse, VariantResponse, VariantDetail,
    FuelMapPoint, LoadCurvePoint, GearRatioItem,
    VariantComparisonRequest, VariantComparisonItem,
)

router = APIRouter(prefix="/api/v1", tags=["Vehicles & Variants"])


# ── Vehicles ──
@router.get("/vehicles", response_model=list[VehicleResponse])
async def list_vehicles(
    category: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Vehicle)
    if category:
        query = query.where(Vehicle.category == category)
    query = query.order_by(Vehicle.model_name)

    result = await db.execute(query)
    vehicles = result.scalars().all()

    response = []
    for v in vehicles:
        cnt = await db.execute(
            select(func.count()).select_from(VehicleVariant).where(VehicleVariant.vehicle_id == v.id)
        )
        response.append({
            **{c.key: getattr(v, c.key) for c in Vehicle.__table__.columns},
            "variant_count": cnt.scalar() or 0,
        })
    return response


@router.get("/vehicles/{vehicle_id}")
async def get_vehicle(vehicle_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Vehicle).where(Vehicle.id == vehicle_id)
    )
    vehicle = result.scalar_one_or_none()
    if not vehicle:
        raise HTTPException(404, "Vehicle not found")

    # Get variants
    vr = await db.execute(
        select(VehicleVariant).where(VehicleVariant.vehicle_id == vehicle_id).order_by(VehicleVariant.variant_code)
    )
    variants = vr.scalars().all()

    return {
        "vehicle": {c.key: getattr(vehicle, c.key) for c in Vehicle.__table__.columns},
        "variants": [
            {c.key: getattr(var, c.key) for c in VehicleVariant.__table__.columns}
            for var in variants
        ],
    }


@router.post("/vehicles", response_model=VehicleResponse)
async def create_vehicle(data: VehicleCreate, db: AsyncSession = Depends(get_db)):
    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    await db.commit()
    await db.refresh(vehicle)
    return {**{c.key: getattr(vehicle, c.key) for c in Vehicle.__table__.columns}, "variant_count": 0}


# ── Variants ──
@router.get("/variants", response_model=list[VariantResponse])
async def list_variants(
    vehicle_id: UUID = Query(None),
    engine_type: str = Query(None),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(VehicleVariant)
    if vehicle_id:
        query = query.where(VehicleVariant.vehicle_id == vehicle_id)
    if engine_type:
        query = query.where(VehicleVariant.engine_type == engine_type)
    if search:
        query = query.where(
            VehicleVariant.variant_code.ilike(f"%{search}%") |
            VehicleVariant.engine_model.ilike(f"%{search}%")
        )
    query = query.order_by(VehicleVariant.variant_code)

    result = await db.execute(query)
    variants = result.scalars().all()

    response = []
    for v in variants:
        fcm_cnt = await db.execute(
            select(func.count()).select_from(FuelConsumptionMap).where(FuelConsumptionMap.variant_id == v.id)
        )
        fldc_cnt = await db.execute(
            select(func.count()).select_from(FullLoadDragCurve).where(FullLoadDragCurve.variant_id == v.id)
        )
        response.append({
            **{c.key: getattr(v, c.key) for c in VehicleVariant.__table__.columns},
            "fcm_points": fcm_cnt.scalar() or 0,
            "fldc_points": fldc_cnt.scalar() or 0,
        })
    return response


@router.get("/variants/{variant_id}")
async def get_variant_detail(variant_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(VehicleVariant).where(VehicleVariant.id == variant_id)
    )
    variant = result.scalar_one_or_none()
    if not variant:
        raise HTTPException(404, "Variant not found")

    # Get vehicle
    veh = await db.execute(select(Vehicle).where(Vehicle.id == variant.vehicle_id))
    vehicle = veh.scalar_one_or_none()

    # Get related data counts
    fcm_cnt = await db.execute(
        select(func.count()).select_from(FuelConsumptionMap).where(FuelConsumptionMap.variant_id == variant_id)
    )
    fldc_cnt = await db.execute(
        select(func.count()).select_from(FullLoadDragCurve).where(FullLoadDragCurve.variant_id == variant_id)
    )
    gear_cnt = await db.execute(
        select(func.count()).select_from(GearRatio).where(GearRatio.variant_id == variant_id)
    )

    return {
        "variant": {c.key: getattr(variant, c.key) for c in VehicleVariant.__table__.columns},
        "vehicle": {c.key: getattr(vehicle, c.key) for c in Vehicle.__table__.columns} if vehicle else None,
        "data_counts": {
            "fuel_map_points": fcm_cnt.scalar() or 0,
            "load_curve_points": fldc_cnt.scalar() or 0,
            "gear_ratios": gear_cnt.scalar() or 0,
        },
    }


@router.get("/variants/{variant_id}/fuel-map", response_model=list[FuelMapPoint])
async def get_fuel_map(variant_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FuelConsumptionMap)
        .where(FuelConsumptionMap.variant_id == variant_id)
        .order_by(FuelConsumptionMap.engine_speed, FuelConsumptionMap.torque)
    )
    return [
        {"engine_speed": float(r.engine_speed), "torque": float(r.torque), "fuel_consumption": float(r.fuel_consumption)}
        for r in result.scalars().all()
    ]


@router.get("/variants/{variant_id}/load-curves", response_model=list[LoadCurvePoint])
async def get_load_curves(variant_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FullLoadDragCurve)
        .where(FullLoadDragCurve.variant_id == variant_id)
        .order_by(FullLoadDragCurve.engine_speed)
    )
    return [
        {"engine_speed": float(r.engine_speed), "max_torque": float(r.max_torque), "drag_torque": float(r.drag_torque)}
        for r in result.scalars().all()
    ]


@router.get("/variants/{variant_id}/gear-ratios", response_model=list[GearRatioItem])
async def get_gear_ratios(variant_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GearRatio)
        .where(GearRatio.variant_id == variant_id)
        .order_by(GearRatio.gear_number)
    )
    return [
        {"gear_number": r.gear_number, "ratio": float(r.ratio)}
        for r in result.scalars().all()
    ]


# ── Comparison ──
@router.post("/variants/compare")
async def compare_variants(req: VariantComparisonRequest, db: AsyncSession = Depends(get_db)):
    items = []
    for vid in req.variant_ids:
        result = await db.execute(
            select(VehicleVariant).where(VehicleVariant.id == vid)
        )
        variant = result.scalar_one_or_none()
        if not variant:
            continue
        veh = await db.execute(select(Vehicle).where(Vehicle.id == variant.vehicle_id))
        vehicle = veh.scalar_one_or_none()
        items.append({
            "variant_id": variant.id,
            "variant_code": variant.variant_code,
            "model_name": vehicle.model_name if vehicle else "N/A",
            "engine_manufacturer": variant.engine_manufacturer,
            "engine_model": variant.engine_model,
            "displacement_cc": variant.displacement_cc,
            "rated_power_w": variant.rated_power_w,
            "max_torque_nm": float(variant.max_torque_nm) if variant.max_torque_nm else None,
            "max_laden_mass_kg": variant.max_laden_mass_kg,
            "gear_count": variant.gear_count,
            "axle_ratio": float(variant.axle_ratio) if variant.axle_ratio else None,
            "tyre_dimension": variant.tyre_dimension,
            "fuel_type": variant.fuel_type,
            "gearbox_model": variant.gearbox_model,
        })
    return {"variants": items}
