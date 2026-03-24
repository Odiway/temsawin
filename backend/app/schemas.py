from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


# ── Vehicle ──
class VehicleBase(BaseModel):
    model_name: str
    manufacturer: str = "TEMSA"
    category: str
    subcategory: Optional[str] = None
    legislative_category: str = "M3"
    chassis_config: Optional[str] = None
    axle_config: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleResponse(VehicleBase):
    id: UUID
    created_at: datetime
    variant_count: int = 0

    model_config = {"from_attributes": True}


# ── Vehicle Variant ──
class VariantBase(BaseModel):
    variant_code: str
    filename: Optional[str] = None
    engine_type: str = "diesel"
    engine_manufacturer: Optional[str] = None
    engine_model: Optional[str] = None
    displacement_cc: Optional[int] = None
    rated_speed_rpm: Optional[int] = None
    rated_power_w: Optional[int] = None
    max_torque_nm: Optional[float] = None
    idling_speed_rpm: Optional[int] = None
    fuel_type: Optional[str] = None
    max_laden_mass_kg: Optional[int] = None
    gearbox_manufacturer: Optional[str] = None
    gearbox_model: Optional[str] = None
    gear_count: Optional[int] = None
    axle_ratio: Optional[float] = None
    axle_type: Optional[str] = None
    tyre_dimension: Optional[str] = None
    zero_emission_vehicle: bool = False


class VariantCreate(VariantBase):
    vehicle_id: UUID


class VariantResponse(VariantBase):
    id: UUID
    vehicle_id: UUID
    import_date: Optional[datetime] = None
    is_active: bool = True
    fcm_points: int = 0
    fldc_points: int = 0

    model_config = {"from_attributes": True}


class VariantDetail(VariantResponse):
    engine_cert_number: Optional[str] = None
    gearbox_type: Optional[str] = None
    tyre_manufacturer: Optional[str] = None
    tyre_model: Optional[str] = None
    engine_stop_start: bool = False
    eco_roll: bool = False
    predictive_cruise: str = "none"
    fan_technology: Optional[str] = None
    steering_pump_tech: Optional[str] = None
    alternator_tech: Optional[str] = None
    pneumatic_config: dict = {}
    hvac_config: dict = {}
    retarder_type: Optional[str] = None
    vecto_schema_version: Optional[str] = None


# ── Fuel Map Point ──
class FuelMapPoint(BaseModel):
    engine_speed: float
    torque: float
    fuel_consumption: float


# ── Load Curve Point ──
class LoadCurvePoint(BaseModel):
    engine_speed: float
    max_torque: float
    drag_torque: float


# ── Gear Ratio ──
class GearRatioItem(BaseModel):
    gear_number: int
    ratio: float


# ── Import ──
class ImportResult(BaseModel):
    filename: str
    status: str
    vehicle_model: Optional[str] = None
    variant_code: Optional[str] = None
    variant_id: Optional[UUID] = None
    message: str = ""
    record_counts: dict = {}


class BulkImportResult(BaseModel):
    total_files: int
    success_count: int
    error_count: int
    results: list[ImportResult]


# ── Dashboard Stats ──
class DashboardStats(BaseModel):
    total_vehicles: int
    total_variants: int
    total_simulations: int
    variants_by_category: dict
    variants_by_engine_type: dict
    recent_imports: list[dict]


# ── Comparison ──
class VariantComparisonRequest(BaseModel):
    variant_ids: list[UUID] = Field(..., min_length=2, max_length=10)


class VariantComparisonItem(BaseModel):
    variant_id: UUID
    variant_code: str
    model_name: str
    engine_model: Optional[str]
    displacement_cc: Optional[int]
    rated_power_w: Optional[int]
    max_torque_nm: Optional[float]
    max_laden_mass_kg: Optional[int]
    gear_count: Optional[int]
    axle_ratio: Optional[float]
    tyre_dimension: Optional[str]
    fuel_type: Optional[str]
