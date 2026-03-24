-- ============================================================
-- TEMSA Digital Twin — Database Schema
-- PostgreSQL 16 — Full initialization
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── ENUM Types ──
CREATE TYPE vehicle_category AS ENUM ('coach', 'city', 'ev', 'diesel');
CREATE TYPE engine_type AS ENUM ('diesel', 'electric', 'hybrid');
CREATE TYPE simulation_source AS ENUM ('vecto', 'matlab', 'custom');
CREATE TYPE simulation_status AS ENUM ('pending', 'processing', 'completed', 'failed');
CREATE TYPE test_type AS ENUM ('track', 'road', 'endurance', 'customer');

-- ============================================================
-- 1. VEHICLES — Ana araç modelleri
-- ============================================================
CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name      VARCHAR(100) NOT NULL,
    manufacturer    VARCHAR(200) NOT NULL DEFAULT 'TEMSA',
    category        vehicle_category NOT NULL,
    subcategory     VARCHAR(50),
    legislative_category VARCHAR(10) DEFAULT 'M3',
    chassis_config  VARCHAR(50),
    axle_config     VARCHAR(20),
    base_config     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_category ON vehicles(category);
CREATE INDEX idx_vehicles_model ON vehicles(model_name);

-- ============================================================
-- 2. VEHICLE_VARIANTS — Araç varyantları
-- ============================================================
CREATE TABLE vehicle_variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    variant_code    VARCHAR(50) NOT NULL UNIQUE,
    filename        VARCHAR(255),
    engine_type     engine_type NOT NULL DEFAULT 'diesel',
    -- Engine details
    engine_manufacturer   VARCHAR(200),
    engine_model          VARCHAR(200),
    engine_cert_number    VARCHAR(200),
    displacement_cc       INTEGER,
    rated_speed_rpm       INTEGER,
    rated_power_w         INTEGER,
    max_torque_nm         NUMERIC(8,2),
    idling_speed_rpm      INTEGER,
    fuel_type             VARCHAR(50),
    -- Vehicle specs
    max_laden_mass_kg     INTEGER,
    curb_weight_kg        INTEGER,
    aero_cd_a             NUMERIC(6,4),
    -- Gearbox
    gearbox_manufacturer  VARCHAR(200),
    gearbox_model         VARCHAR(200),
    gear_count            INTEGER,
    gearbox_type          VARCHAR(50),
    -- Axle
    axle_ratio            NUMERIC(6,3),
    axle_type             VARCHAR(100),
    -- Tyres
    tyre_manufacturer     VARCHAR(200),
    tyre_model            VARCHAR(200),
    tyre_dimension        VARCHAR(100),
    -- ADAS
    engine_stop_start     BOOLEAN DEFAULT FALSE,
    eco_roll              BOOLEAN DEFAULT FALSE,
    predictive_cruise     VARCHAR(50) DEFAULT 'none',
    -- Auxiliaries
    fan_technology        VARCHAR(200),
    steering_pump_tech    VARCHAR(200),
    alternator_tech       VARCHAR(100),
    pneumatic_config      JSONB DEFAULT '{}',
    hvac_config           JSONB DEFAULT '{}',
    -- Zero emission
    zero_emission_vehicle BOOLEAN DEFAULT FALSE,
    -- Retarder
    retarder_type         VARCHAR(200),
    retarder_ratio        NUMERIC(6,3),
    -- Full raw config
    raw_xml_data          JSONB DEFAULT '{}',
    -- Metadata
    vecto_schema_version  VARCHAR(20),
    import_date           TIMESTAMPTZ DEFAULT NOW(),
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_variants_vehicle ON vehicle_variants(vehicle_id);
CREATE INDEX idx_variants_code ON vehicle_variants(variant_code);
CREATE INDEX idx_variants_engine ON vehicle_variants(engine_type);
CREATE INDEX idx_variants_filename ON vehicle_variants(filename);

-- ============================================================
-- 3. FUEL_CONSUMPTION_MAPS — Motor yakıt haritaları
-- ============================================================
CREATE TABLE fuel_consumption_maps (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    engine_speed    NUMERIC(8,2) NOT NULL,
    torque          NUMERIC(10,2) NOT NULL,
    fuel_consumption NUMERIC(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fcm_variant ON fuel_consumption_maps(variant_id);

-- ============================================================
-- 4. FULL_LOAD_DRAG_CURVES — Motor yük/sürükleme eğrileri
-- ============================================================
CREATE TABLE full_load_drag_curves (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    engine_speed    NUMERIC(8,2) NOT NULL,
    max_torque      NUMERIC(10,2) NOT NULL,
    drag_torque     NUMERIC(10,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fldc_variant ON full_load_drag_curves(variant_id);

-- ============================================================
-- 5. GEAR_RATIOS — Vites oranları
-- ============================================================
CREATE TABLE gear_ratios (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    gear_number     INTEGER NOT NULL,
    ratio           NUMERIC(8,4) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gr_variant ON gear_ratios(variant_id);

-- ============================================================
-- 6. TORQUE_CONVERTER_CHARS — Tork konvertör karakteristikleri
-- ============================================================
CREATE TABLE torque_converter_chars (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    speed_ratio     NUMERIC(8,4) NOT NULL,
    torque_ratio    NUMERIC(8,4) NOT NULL,
    input_torque_ref NUMERIC(10,4),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tcc_variant ON torque_converter_chars(variant_id);

-- ============================================================
-- 7. AXLE_LOSS_MAPS — Aks kayıp haritaları
-- ============================================================
CREATE TABLE axle_loss_maps (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    input_speed     NUMERIC(10,2) NOT NULL,
    input_torque    NUMERIC(10,2) NOT NULL,
    torque_loss     NUMERIC(10,4) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alm_variant ON axle_loss_maps(variant_id);

-- ============================================================
-- 8. SIMULATION_RUNS — Simülasyon çalıştırmaları
-- ============================================================
CREATE TABLE simulation_runs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    source          simulation_source NOT NULL,
    scenario        VARCHAR(100),
    input_params    JSONB DEFAULT '{}',
    status          simulation_status DEFAULT 'pending',
    raw_file_path   TEXT,
    error_message   TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_simruns_variant ON simulation_runs(variant_id);
CREATE INDEX idx_simruns_source ON simulation_runs(source);
CREATE INDEX idx_simruns_status ON simulation_runs(status);

-- ============================================================
-- 9. SIMULATION_RESULTS — Simülasyon sonuçları
-- ============================================================
CREATE TABLE simulation_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id          UUID NOT NULL REFERENCES simulation_runs(id) ON DELETE CASCADE,
    co2_g_per_km    NUMERIC(10,3),
    fuel_l_per_100km NUMERIC(8,3),
    energy_kwh_per_km NUMERIC(8,4),
    range_km        NUMERIC(8,2),
    efficiency_pct  NUMERIC(5,2),
    extended_results JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_simresults_run ON simulation_results(run_id);

-- ============================================================
-- 10. REAL_TEST_RESULTS — Gerçek test sonuçları
-- ============================================================
CREATE TABLE real_test_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id      UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    test_type       test_type NOT NULL,
    co2_g_per_km    NUMERIC(10,3),
    fuel_l_per_100km NUMERIC(8,3),
    energy_kwh_per_km NUMERIC(8,4),
    conditions      JSONB DEFAULT '{}',
    notes           TEXT,
    tested_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_testresults_variant ON real_test_results(variant_id);

-- ============================================================
-- 11. IMPORT_LOGS — İmport geçmişi
-- ============================================================
CREATE TABLE import_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename        VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'success',
    vehicle_model   VARCHAR(100),
    variant_code    VARCHAR(50),
    variant_id      UUID REFERENCES vehicle_variants(id),
    error_message   TEXT,
    record_counts   JSONB DEFAULT '{}',
    imported_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_importlogs_filename ON import_logs(filename);
CREATE INDEX idx_importlogs_status ON import_logs(status);

-- ============================================================
-- Updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variants_updated_at
    BEFORE UPDATE ON vehicle_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Summary view: quick variant overview
-- ============================================================
CREATE VIEW v_variant_summary AS
SELECT
    vv.id AS variant_id,
    vv.variant_code,
    vv.filename,
    v.model_name,
    v.category,
    vv.engine_type,
    vv.engine_manufacturer,
    vv.engine_model,
    vv.displacement_cc,
    vv.rated_power_w,
    vv.max_torque_nm,
    vv.max_laden_mass_kg,
    vv.gearbox_model,
    vv.gear_count,
    vv.axle_ratio,
    vv.tyre_dimension,
    vv.zero_emission_vehicle,
    vv.import_date,
    (SELECT COUNT(*) FROM fuel_consumption_maps f WHERE f.variant_id = vv.id) AS fcm_points,
    (SELECT COUNT(*) FROM full_load_drag_curves fl WHERE fl.variant_id = vv.id) AS fldc_points,
    (SELECT COUNT(*) FROM gear_ratios gr WHERE gr.variant_id = vv.id) AS gear_count_actual
FROM vehicle_variants vv
JOIN vehicles v ON v.id = vv.vehicle_id
ORDER BY v.model_name, vv.variant_code;
