-- Migration for Location Tags Feature

-- 1. Create the new table for location tags
CREATE TABLE IF NOT EXISTS public.location_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    factory_id TEXT NOT NULL,
    system_id VARCHAR(3) NOT NULL, -- Format XYY
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'lost')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure system_id is unique per condominium
    CONSTRAINT uq_condo_system_tag UNIQUE (condominium_id, system_id),
    -- Ensure factory_id is unique globally or at least per brand/condo
    CONSTRAINT uq_factory_id UNIQUE (factory_id)
);

-- Enable RLS
ALTER TABLE public.location_tags ENABLE ROW LEVEL SECURITY;

-- Create policies (admin/viewing)
CREATE POLICY "Enable read access for all users" ON public.location_tags FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.location_tags FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.location_tags FOR UPDATE USING (true);

-- 2. Update deliveries table to support location tags
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS location_tag_id UUID REFERENCES public.location_tags(id) ON DELETE SET NULL;

-- 3. Add to condominiums table a setting to require tags (or we can handle it in a settings JSON)
-- Assuming we don't have a rigid settings table, we can append a column or rely on the frontend integration settings.
ALTER TABLE public.condominiums
ADD COLUMN IF NOT EXISTS require_location_tags BOOLEAN DEFAULT FALSE;
