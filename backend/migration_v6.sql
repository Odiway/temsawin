-- Migration V6: Engineering role for weight calc, simutem, homologasyon modules
-- Run: docker exec -i temsa-db psql -U temsa -d temsa_twin < migration_v6.sql

INSERT INTO roles (name, description, permissions) VALUES
    ('engineering', 'Mühendislik — Ağırlık hesaplama, simülasyon, homologasyon', '["view","weightcalc","simutem","homologasyon"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Also ensure entegration and design roles exist (from previous migrations)
INSERT INTO roles (name, description, permissions) VALUES
    ('entegration', 'Entegrasyon — BOM, malzeme, takvim', '["view","bom","materials","calendar"]'::jsonb),
    ('design', 'Tasarım — VECTO analiz, CO2, PDF', '["view","export","compare"]'::jsonb)
ON CONFLICT (name) DO NOTHING;
