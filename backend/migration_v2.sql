-- TEMSA Digital Twin — Migration: Add fleet_count and vecto_results_certified
-- Run this against temsa_twin database

ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS fleet_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS vecto_results_certified (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES vehicle_variants(id) ON DELETE CASCADE,
    vin VARCHAR(50) NOT NULL,
    vehicle_model VARCHAR(100),
    vehicle_category VARCHAR(10),
    vehicle_group VARCHAR(20),
    vehicle_group_co2 VARCHAR(20),
    class_bus VARCHAR(10),
    axle_configuration VARCHAR(20),
    corrected_actual_mass_kg NUMERIC(10,2),
    tech_max_laden_mass_kg NUMERIC(10,2),
    total_propulsion_power_kw NUMERIC(8,2),
    total_passengers INTEGER,
    mission VARCHAR(50) NOT NULL,
    loading VARCHAR(50) NOT NULL,
    total_vehicle_mass_kg NUMERIC(10,2),
    mass_passengers_kg NUMERIC(10,2),
    passenger_count NUMERIC(8,2),
    avg_speed_kmh NUMERIC(8,2),
    co2_g_per_km NUMERIC(10,3),
    co2_g_per_pkm NUMERIC(10,3),
    fc_g_per_km NUMERIC(10,3),
    fc_g_per_pkm NUMERIC(10,3),
    fc_mj_per_km NUMERIC(10,4),
    fc_mj_per_pkm NUMERIC(10,4),
    fc_l_per_100km NUMERIC(10,3),
    fc_l_per_pkm NUMERIC(10,6),
    is_summary BOOLEAN DEFAULT FALSE,
    summary_co2_g_per_km NUMERIC(10,3),
    summary_co2_g_per_pkm NUMERIC(10,3),
    summary_fc_l_per_100km NUMERIC(10,3),
    summary_avg_passenger_count NUMERIC(8,2),
    engine_rated_power_kw NUMERIC(8,2),
    engine_capacity_ltr NUMERIC(6,2),
    fuel_type VARCHAR(50),
    transmission_type VARCHAR(20),
    nr_of_gears INTEGER,
    retarder BOOLEAN,
    axle_ratio NUMERIC(6,3),
    average_rrc NUMERIC(8,4),
    tyre_dimension VARCHAR(50),
    hvac_config VARCHAR(20),
    double_glazing BOOLEAN,
    engine_stop_start BOOLEAN DEFAULT FALSE,
    eco_roll BOOLEAN DEFAULT FALSE,
    predictive_cruise_control BOOLEAN DEFAULT FALSE,
    source_file VARCHAR(500),
    source_type VARCHAR(30),
    simulation_tool_version VARCHAR(50),
    simulation_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'success',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vecto_results_vin ON vecto_results_certified(vin);
CREATE INDEX IF NOT EXISTS idx_vecto_results_variant ON vecto_results_certified(variant_id);
CREATE INDEX IF NOT EXISTS idx_vecto_results_summary ON vecto_results_certified(is_summary) WHERE is_summary = TRUE;
