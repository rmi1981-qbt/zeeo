-- ==============================================================================
-- Hub Architecture & Integrations Schema
-- Please run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Providers (e.g., iFood, Mercado Livre) that send data to our Hub Inbound API
CREATE TABLE IF NOT EXISTS public.hub_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'ifood', 'mercadolivre', 'uber'
    api_key TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Condominium Webhooks for receiving Outbound Hub events
CREATE TABLE IF NOT EXISTS public.condominium_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    condominium_id UUID NOT NULL REFERENCES public.condominiums(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret_key TEXT, -- Used to sign the webhook payload for security verification
    events TEXT[] DEFAULT '{all}', -- e.g., 'delivery.created', 'delivery.status_updated', 'location.updated'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Enable RLS
ALTER TABLE public.hub_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condominium_webhooks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Providers: Only accessible internally via service role (bypasses RLS) or read-only configs
CREATE POLICY "Allow public read for active providers" ON public.hub_providers FOR SELECT USING (is_active = true);

-- Webhooks: Condominium Admins can manage their webhooks
CREATE POLICY "Admins can view their condo webhooks" ON public.condominium_webhooks 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.condominium_members 
            WHERE user_id = auth.uid() 
            AND condominium_id = condominium_webhooks.condominium_id 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert webhooks" ON public.condominium_webhooks 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.condominium_members 
            WHERE user_id = auth.uid() 
            AND condominium_id = condominium_webhooks.condominium_id 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update their webhooks" ON public.condominium_webhooks 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.condominium_members 
            WHERE user_id = auth.uid() 
            AND condominium_id = condominium_webhooks.condominium_id 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete their webhooks" ON public.condominium_webhooks 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.condominium_members 
            WHERE user_id = auth.uid() 
            AND condominium_id = condominium_webhooks.condominium_id 
            AND role = 'admin'
        )
    );

-- Insert dummy data for our simulator
INSERT INTO public.hub_providers (name, api_key) 
VALUES 
    ('ifood', 'sim-key-ifood-123'),
    ('mercadolivre', 'sim-key-ml-123'),
    ('uber', 'sim-key-uber-123')
ON CONFLICT (name) DO NOTHING;
