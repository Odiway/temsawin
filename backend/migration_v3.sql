-- TEMSA Digital Twin — Migration v3: Add output file columns to vecto_results_certified
-- Run this against temsa_twin database

-- New columns for RSLT_MANUFACTURER output files
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS primary_subgroup VARCHAR(20);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS payload_kg NUMERIC(10,2);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS avg_driving_speed_kmh NUMERIC(8,2);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS max_speed_kmh NUMERIC(8,2);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS gearbox_efficiency_pct NUMERIC(6,3);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS axlegear_efficiency_pct NUMERIC(6,3);
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS gearshift_count INTEGER;
ALTER TABLE vecto_results_certified ADD COLUMN IF NOT EXISTS energy_mj_per_km NUMERIC(10,4);

-- Index for subgroup queries
CREATE INDEX IF NOT EXISTS idx_vecto_results_subgroup ON vecto_results_certified(primary_subgroup);
