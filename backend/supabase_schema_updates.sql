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
