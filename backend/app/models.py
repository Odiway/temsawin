import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, Boolean, Text, ForeignKey,
    Enum as PgEnum, DateTime, JSON
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


# ── Vehicles ──
class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    model_name = Column(String(100), nullable=False)
    manufacturer = Column(String(200), nullable=False, default="TEMSA")
    category = Column(PgEnum("coach", "city", "ev", "diesel", name="vehicle_category"), nullable=False)
    subcategory = Column(String(50))
    legislative_category = Column(String(10), default="M3")
    chassis_config = Column(String(50))
    axle_config = Column(String(20))
    base_config = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    variants = relationship("VehicleVariant", back_populates="vehicle", cascade="all, delete-orphan")


# ── Vehicle Variants ──
class VehicleVariant(Base):
    __tablename__ = "vehicle_variants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False)
    variant_code = Column(String(50), nullable=False, unique=True)
    filename = Column(String(255))
    engine_type = Column(PgEnum("diesel", "electric", "hybrid", name="engine_type"), default="diesel")
    # Engine
    engine_manufacturer = Column(String(200))
    engine_model = Column(String(200))
    engine_cert_number = Column(String(200))
    displacement_cc = Column(Integer)
    rated_speed_rpm = Column(Integer)
    rated_power_w = Column(Integer)
    max_torque_nm = Column(Numeric(8, 2))
    idling_speed_rpm = Column(Integer)
    fuel_type = Column(String(50))
    # Vehicle
    max_laden_mass_kg = Column(Integer)
    curb_weight_kg = Column(Integer)
    aero_cd_a = Column(Numeric(6, 4))
    # Gearbox
    gearbox_manufacturer = Column(String(200))
    gearbox_model = Column(String(200))
    gear_count = Column(Integer)
    gearbox_type = Column(String(50))
    # Axle
    axle_ratio = Column(Numeric(6, 3))
    axle_type = Column(String(100))
    # Tyres (legacy single)
    tyre_manufacturer = Column(String(200))
    tyre_model = Column(String(200))
    tyre_dimension = Column(String(100))
    # Tyres - Front axle
    tyre_front_manufacturer = Column(String(200))
    tyre_front_model = Column(String(200))
    tyre_front_dimension = Column(String(100))
    tyre_front_rrc = Column(Numeric(10, 6))
    tyre_front_fz_iso = Column(Numeric(10, 2))
    tyre_front_twin_tyres = Column(Boolean, default=False)
    # Tyres - Rear axle
    tyre_rear_manufacturer = Column(String(200))
    tyre_rear_model = Column(String(200))
    tyre_rear_dimension = Column(String(100))
    tyre_rear_rrc = Column(Numeric(10, 6))
    tyre_rear_fz_iso = Column(Numeric(10, 2))
    tyre_rear_twin_tyres = Column(Boolean, default=False)
    # ADAS
    engine_stop_start = Column(Boolean, default=False)
    eco_roll = Column(Boolean, default=False)
    predictive_cruise = Column(String(50), default="none")
    # Auxiliaries
    fan_technology = Column(String(200))
    steering_pump_tech = Column(String(200))
    alternator_tech = Column(String(100))
    pneumatic_config = Column(JSON, default={})
    hvac_config = Column(JSON, default={})
    # CO2 / WHTC correction factors
    whtc_urban = Column(Numeric(8, 5))
    whtc_rural = Column(Numeric(8, 5))
    whtc_motorway = Column(Numeric(8, 5))
    bf_cold_hot = Column(Numeric(8, 5))
    cf_reg_per = Column(Numeric(8, 5))
    cf_ncv = Column(Numeric(8, 5))
    rrc_declared = Column(Numeric(10, 6))
    fz_iso = Column(Numeric(10, 2))
    # Fleet tracking
    fleet_count = Column(Integer, default=0)  # Number of vehicles of this variant in fleet
    # Zero emission
    zero_emission_vehicle = Column(Boolean, default=False)
    # Retarder
    retarder_type = Column(String(200))
    retarder_ratio = Column(Numeric(6, 3))
    # Raw data
    raw_xml_data = Column(JSON, default={})
    vecto_schema_version = Column(String(20))
    import_date = Column(DateTime(timezone=True), default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    vehicle = relationship("Vehicle", back_populates="variants")
    fuel_maps = relationship("FuelConsumptionMap", back_populates="variant", cascade="all, delete-orphan")
    load_curves = relationship("FullLoadDragCurve", back_populates="variant", cascade="all, delete-orphan")
    gear_ratios = relationship("GearRatio", back_populates="variant", cascade="all, delete-orphan")
    torque_converter = relationship("TorqueConverterChar", back_populates="variant", cascade="all, delete-orphan")
    axle_losses = relationship("AxleLossMap", back_populates="variant", cascade="all, delete-orphan")
    simulation_runs = relationship("SimulationRun", back_populates="variant", cascade="all, delete-orphan")
    test_results = relationship("RealTestResult", back_populates="variant", cascade="all, delete-orphan")
    vecto_results = relationship("VectoResultCertified", back_populates="variant", cascade="all, delete-orphan")


# ── Fuel Consumption Maps ──
class FuelConsumptionMap(Base):
    __tablename__ = "fuel_consumption_maps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    engine_speed = Column(Numeric(8, 2), nullable=False)
    torque = Column(Numeric(10, 2), nullable=False)
    fuel_consumption = Column(Numeric(12, 2), nullable=False)

    variant = relationship("VehicleVariant", back_populates="fuel_maps")


# ── Full Load Drag Curves ──
class FullLoadDragCurve(Base):
    __tablename__ = "full_load_drag_curves"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    engine_speed = Column(Numeric(8, 2), nullable=False)
    max_torque = Column(Numeric(10, 2), nullable=False)
    drag_torque = Column(Numeric(10, 2), nullable=False)

    variant = relationship("VehicleVariant", back_populates="load_curves")


# ── Gear Ratios ──
class GearRatio(Base):
    __tablename__ = "gear_ratios"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    gear_number = Column(Integer, nullable=False)
    ratio = Column(Numeric(8, 4), nullable=False)

    variant = relationship("VehicleVariant", back_populates="gear_ratios")


# ── Torque Converter Characteristics ──
class TorqueConverterChar(Base):
    __tablename__ = "torque_converter_chars"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    speed_ratio = Column(Numeric(8, 4), nullable=False)
    torque_ratio = Column(Numeric(8, 4), nullable=False)
    input_torque_ref = Column(Numeric(10, 4))

    variant = relationship("VehicleVariant", back_populates="torque_converter")


# ── Axle Loss Maps ──
class AxleLossMap(Base):
    __tablename__ = "axle_loss_maps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    input_speed = Column(Numeric(10, 2), nullable=False)
    input_torque = Column(Numeric(10, 2), nullable=False)
    torque_loss = Column(Numeric(10, 4), nullable=False)

    variant = relationship("VehicleVariant", back_populates="axle_losses")


# ── Simulation Runs ──
class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    source = Column(PgEnum("vecto", "matlab", "custom", name="simulation_source"), nullable=False)
    scenario = Column(String(100))
    input_params = Column(JSON, default={})
    status = Column(PgEnum("pending", "processing", "completed", "failed", name="simulation_status"), default="pending")
    raw_file_path = Column(Text)
    error_message = Column(Text)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    variant = relationship("VehicleVariant", back_populates="simulation_runs")
    results = relationship("SimulationResult", back_populates="run", cascade="all, delete-orphan")


# ── Simulation Results ──
class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False)
    co2_g_per_km = Column(Numeric(10, 3))
    fuel_l_per_100km = Column(Numeric(8, 3))
    energy_kwh_per_km = Column(Numeric(8, 4))
    range_km = Column(Numeric(8, 2))
    efficiency_pct = Column(Numeric(5, 2))
    extended_results = Column(JSON, default={})
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="results")


# ── Real Test Results ──
class RealTestResult(Base):
    __tablename__ = "real_test_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"), nullable=False)
    test_type = Column(PgEnum("track", "road", "endurance", "customer", name="test_type"), nullable=False)
    co2_g_per_km = Column(Numeric(10, 3))
    fuel_l_per_100km = Column(Numeric(8, 3))
    energy_kwh_per_km = Column(Numeric(8, 4))
    conditions = Column(JSON, default={})
    notes = Column(Text)
    tested_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    variant = relationship("VehicleVariant", back_populates="test_results")


# ── VECTO Official Results (from RSLT_CUSTOMER / RSLT_MANUFACTURER result XMLs) ──
class VectoResultCertified(Base):
    """
    Official VECTO simulation results per variant.
    This is the source-of-truth for CO2 — we do NOT calculate CO2 ourselves.
    Each row = one mission+loading combination result from a VECTO result file.
    """
    __tablename__ = "vecto_results_certified"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"))
    vin = Column(String(50), nullable=False, index=True)
    # Vehicle info from result file
    vehicle_model = Column(String(100))
    vehicle_category = Column(String(10))
    vehicle_group = Column(String(20))
    vehicle_group_co2 = Column(String(20))
    class_bus = Column(String(10))
    axle_configuration = Column(String(20))
    corrected_actual_mass_kg = Column(Numeric(10, 2))
    tech_max_laden_mass_kg = Column(Numeric(10, 2))
    total_propulsion_power_kw = Column(Numeric(8, 2))
    total_passengers = Column(Integer)
    # Mission result
    mission = Column(String(50), nullable=False)  # Interurban, Coach, Urban, Suburban, HeavyUrban
    loading = Column(String(50), nullable=False)  # LowLoading, ReferenceLoad
    primary_subgroup = Column(String(20))  # P31SD, P31DD, P32SD, P32DD
    distance_km = Column(Numeric(10, 2))
    # Simulation parameters for this run
    total_vehicle_mass_kg = Column(Numeric(10, 2))
    payload_kg = Column(Numeric(10, 2))
    mass_passengers_kg = Column(Numeric(10, 2))
    passenger_count = Column(Numeric(8, 2))
    avg_speed_kmh = Column(Numeric(8, 2))
    # Vehicle Performance
    avg_driving_speed_kmh = Column(Numeric(8, 2))
    max_speed_kmh = Column(Numeric(8, 2))
    gearbox_efficiency_pct = Column(Numeric(6, 3))
    axlegear_efficiency_pct = Column(Numeric(6, 3))
    gearshift_count = Column(Integer)
    # Energy consumption (from VIF)
    energy_mj_per_km = Column(Numeric(10, 4))
    # CO2 Results — THE source of truth
    co2_g_per_km = Column(Numeric(10, 3))
    co2_g_per_pkm = Column(Numeric(10, 3))
    # Fuel Consumption
    fc_g_per_km = Column(Numeric(10, 3))
    fc_g_per_pkm = Column(Numeric(10, 3))
    fc_mj_per_km = Column(Numeric(10, 4))
    fc_mj_per_pkm = Column(Numeric(10, 4))
    fc_l_per_100km = Column(Numeric(10, 3))
    fc_l_per_pkm = Column(Numeric(10, 6))
    # Summary (weighted average across loadings) — from <Summary> element
    is_summary = Column(Boolean, default=False)
    summary_co2_g_per_km = Column(Numeric(10, 3))
    summary_co2_g_per_pkm = Column(Numeric(10, 3))
    summary_fc_l_per_100km = Column(Numeric(10, 3))
    summary_avg_passenger_count = Column(Numeric(8, 2))
    # Vehicle features (from result file)
    engine_rated_power_kw = Column(Numeric(8, 2))
    engine_capacity_ltr = Column(Numeric(6, 2))
    fuel_type = Column(String(50))
    transmission_type = Column(String(20))
    nr_of_gears = Column(Integer)
    retarder = Column(Boolean)
    axle_ratio = Column(Numeric(6, 3))
    average_rrc = Column(Numeric(8, 4))
    tyre_dimension = Column(String(50))
    hvac_config = Column(String(20))
    double_glazing = Column(Boolean)
    # ADAS
    engine_stop_start = Column(Boolean, default=False)
    eco_roll = Column(Boolean, default=False)
    predictive_cruise_control = Column(Boolean, default=False)
    # Source
    source_file = Column(String(500))
    source_type = Column(String(30))  # 'RSLT_CUSTOMER', 'RSLT_MANUFACTURER'
    simulation_tool_version = Column(String(50))
    simulation_date = Column(DateTime(timezone=True))
    status = Column(String(20), default="success")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    variant = relationship("VehicleVariant", back_populates="vecto_results")


# ── VECTO Simulation Outputs (from real VECTO tool runs) ──
class VectoSimulationOutput(Base):
    __tablename__ = "vecto_simulation_outputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id", ondelete="CASCADE"))
    vin = Column(String(50), nullable=False, index=True)
    vehicle_model = Column(String(100))
    vehicle_group = Column(String(20))
    mission = Column(String(50), nullable=False)  # Interurban, Coach, Urban, Suburban, HeavyUrban
    loading = Column(String(50), nullable=False)  # LowLoading, ReferenceLoad
    primary_subgroup = Column(String(20))
    # CO2 Results
    co2_g_per_km = Column(Numeric(10, 3))
    co2_g_per_pkm = Column(Numeric(10, 3))
    # Fuel Consumption
    fc_g_per_km = Column(Numeric(10, 3))
    fc_l_per_100km = Column(Numeric(10, 3))
    fc_mj_per_km = Column(Numeric(10, 4))
    # Vehicle Parameters
    total_vehicle_mass_kg = Column(Numeric(10, 2))
    payload_kg = Column(Numeric(10, 2))
    passenger_count = Column(Numeric(8, 2))
    corrected_actual_mass_kg = Column(Numeric(10, 2))
    # Performance
    avg_speed_kmh = Column(Numeric(8, 2))
    avg_driving_speed_kmh = Column(Numeric(8, 2))
    max_speed_kmh = Column(Numeric(8, 2))
    gearbox_efficiency_pct = Column(Numeric(6, 3))
    axlegear_efficiency_pct = Column(Numeric(6, 3))
    gearshift_count = Column(Integer)
    # Engine
    engine_rated_power_kw = Column(Numeric(8, 2))
    engine_displacement_cc = Column(Integer)
    axle_ratio = Column(Numeric(6, 3))
    # Correction factors used in simulation
    whtc_urban = Column(Numeric(8, 5))
    whtc_rural = Column(Numeric(8, 5))
    whtc_motorway = Column(Numeric(8, 5))
    bf_cold_hot = Column(Numeric(8, 5))
    cf_reg_per = Column(Numeric(8, 5))
    cf_actual = Column(Numeric(10, 7))
    # Source info
    source_file = Column(String(500))
    simulation_tool_version = Column(String(50))
    status = Column(String(20), default="success")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# ── Import Logs ──
class ImportLog(Base):
    __tablename__ = "import_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="success")
    vehicle_model = Column(String(100))
    variant_code = Column(String(50))
    variant_id = Column(UUID(as_uuid=True), ForeignKey("vehicle_variants.id"))
    error_message = Column(Text)
    record_counts = Column(JSON, default={})
    imported_at = Column(DateTime(timezone=True), default=datetime.utcnow)


# ── Fleets (Named fleet configurations for CO2 comparison) ──
class Fleet(Base):
    __tablename__ = "fleets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("FleetItem", back_populates="fleet", cascade="all, delete-orphan")


class FleetItem(Base):
    __tablename__ = "fleet_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fleet_id = Column(UUID(as_uuid=True), ForeignKey("fleets.id", ondelete="CASCADE"), nullable=False)
    vin = Column(String(50), nullable=False)
    count = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    fleet = relationship("Fleet", back_populates="items")
