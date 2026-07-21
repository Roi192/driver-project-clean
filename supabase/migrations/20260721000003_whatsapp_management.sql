-- WhatsApp integration: config + distribution groups

CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id      UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000099'::uuid,
  instance_id TEXT,
  api_token   TEXT,
  is_enabled  BOOLEAN DEFAULT true,
  updated_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_rw_whatsapp_config" ON public.whatsapp_config
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );
-- Seed single row
INSERT INTO public.whatsapp_config (id) VALUES ('00000000-0000-0000-0000-000000000099')
  ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.whatsapp_groups (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  wa_id      TEXT NOT NULL UNIQUE,
  is_active  BOOLEAN DEFAULT true,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.whatsapp_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins_rw_whatsapp_groups" ON public.whatsapp_groups
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );
