-- Migração Módulo 1: Gestão Base para MVP 2.0
-- Tabelas: Unidades, Moradores, Funcionários da Unidade e Funcionários do Condomínio

-- 1. Unidades (Residências)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condo_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE units ADD COLUMN IF NOT EXISTS block VARCHAR(50);
ALTER TABLE units ADD COLUMN IF NOT EXISTS number VARCHAR(50);
ALTER TABLE units ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE units ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

-- 2. Moradores
CREATE TABLE IF NOT EXISTS residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS document VARCHAR(50);
ALTER TABLE residents ADD COLUMN IF NOT EXISTS can_authorize_deliveries BOOLEAN DEFAULT FALSE;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 3. Funcionários dos Moradores
CREATE TABLE IF NOT EXISTS resident_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(50),
    role VARCHAR(100),
    can_authorize_deliveries BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Funcionários do Condomínio
CREATE TABLE IF NOT EXISTS condo_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condo_id UUID NOT NULL REFERENCES condominiums(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(50),
    role VARCHAR(100),
    access_level VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices Recomendados
CREATE INDEX IF NOT EXISTS idx_units_condo_id ON units(condo_id);
CREATE INDEX IF NOT EXISTS idx_residents_unit_id ON residents(unit_id);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON residents(phone);
CREATE INDEX IF NOT EXISTS idx_condo_employees_condo_id ON condo_employees(condo_id);

-- Ativando RLS (Opcional, caso a arquitetura requeira anon key)
-- ALTER TABLE units ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE residents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resident_employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE condo_employees ENABLE ROW LEVEL SECURITY;
