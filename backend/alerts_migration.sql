-- Add alert_config to condominiums table
ALTER TABLE public.condominiums 
ADD COLUMN IF NOT EXISTS alert_config JSONB DEFAULT '{}'::jsonb;

-- Add active_alerts to deliveries table
ALTER TABLE public.deliveries 
ADD COLUMN IF NOT EXISTS active_alerts JSONB DEFAULT '[]'::jsonb;
