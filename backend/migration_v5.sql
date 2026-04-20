-- Migration V5: Authentication & Role-Based Access Control
-- Run: docker exec -i temsa-db psql -U temsa -d temsa_twin < migration_v5.sql

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default roles
INSERT INTO roles (name, description, permissions) VALUES
    ('admin', 'Sistem Yöneticisi — Tüm erişim', '["*"]'::jsonb),
    ('manager', 'Yönetici — Veri görüntüleme ve raporlama', '["view","export","compare","fleet"]'::jsonb),
    ('analyst', 'Analist — Veri analizi ve karşılaştırma', '["view","compare"]'::jsonb),
    ('viewer', 'İzleyici — Yalnızca görüntüleme', '["view"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Seed default admin user (password: admin123)
-- bcrypt hash for 'admin123'
INSERT INTO users (username, email, full_name, hashed_password, role_id, is_active) VALUES
    ('admin', 'admin@temsa.com', 'Sistem Yöneticisi', '$2b$12$LJ3m4ys3uz2SuEEDMkHNWO8eE4N5cMx7vXsZ8TDvfyDJMjp3YCSPK', (SELECT id FROM roles WHERE name = 'admin'), TRUE)
ON CONFLICT (username) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);
