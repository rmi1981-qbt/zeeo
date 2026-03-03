-- Schema updates for Gatekeeper Workflow

-- Condominiums: Configure visibility timeout for recent exits and history rules
ALTER TABLE public.condominiums ADD COLUMN IF NOT EXISTS exit_visibility_timeout_mins INTEGER DEFAULT 5;
ALTER TABLE public.condominiums ADD COLUMN IF NOT EXISTS history_visibility_hours INTEGER DEFAULT 24;

-- Deliveries: Track channels used for authorization requests (e.g. ['whatsapp', 'push'])
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS request_channels TEXT[];

-- Delivery Events: Ensure columns exist for robust tracking
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS authorization_method TEXT;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS authorized_by_resident_id UUID;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS authorized_by_resident_name TEXT;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS gate_id UUID;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS gate_name TEXT;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.delivery_events ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Zero-Knowledge Identity Models
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condo_id UUID REFERENCES public.condominiums(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(condo_id, label)
);

CREATE TABLE IF NOT EXISTS public.residents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_hash TEXT,
    document_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies For Units
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.units FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.units FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.units FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.units FOR DELETE USING (true);

-- RLS Policies For Residents
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.residents FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.residents FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.residents FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON public.residents FOR DELETE USING (true);

-- Ensure Realtime Filters work reliably for updates
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;

-- Add QR Code (OTP) columns to deliveries
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS qr_code_token VARCHAR(100);
ALTER TABLE public.deliveries ADD COLUMN IF NOT EXISTS qr_code_expires_at TIMESTAMP WITH TIME ZONE;
