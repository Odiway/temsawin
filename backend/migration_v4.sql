-- Migration v4: Front/Rear tyre support
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_front_manufacturer VARCHAR(200);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_front_model VARCHAR(200);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_front_dimension VARCHAR(100);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_front_rrc NUMERIC(10, 6);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_front_fz_iso NUMERIC(10, 2);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_front_twin_tyres BOOLEAN DEFAULT false;
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_rear_manufacturer VARCHAR(200);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_rear_model VARCHAR(200);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_rear_dimension VARCHAR(100);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_rear_rrc NUMERIC(10, 6);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_rear_fz_iso NUMERIC(10, 2);
ALTER TABLE vehicle_variants ADD COLUMN IF NOT EXISTS tyre_rear_twin_tyres BOOLEAN DEFAULT false;
