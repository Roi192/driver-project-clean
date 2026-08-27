-- WhatsApp brigade isolation: each brigade gets its own config and groups

-- ── whatsapp_config ─────────────────────────────────────────────────────────

-- Add brigade column (existing single row gets 'binyamin')
ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS brigade TEXT NOT NULL DEFAULT 'binyamin';

-- Change id default so new brigade rows get real UUIDs
ALTER TABLE public.whatsapp_config ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Brigade must be unique — one config row per brigade
ALTER TABLE public.whatsapp_config ADD CONSTRAINT whatsapp_config_brigade_unique UNIQUE (brigade);

-- ── whatsapp_groups ─────────────────────────────────────────────────────────

-- Add brigade column (existing rows get 'binyamin')
ALTER TABLE public.whatsapp_groups ADD COLUMN IF NOT EXISTS brigade TEXT NOT NULL DEFAULT 'binyamin';

-- Old unique constraint was on wa_id alone; replace with composite (wa_id, brigade)
ALTER TABLE public.whatsapp_groups DROP CONSTRAINT IF EXISTS whatsapp_groups_wa_id_key;
ALTER TABLE public.whatsapp_groups ADD CONSTRAINT whatsapp_groups_wa_id_brigade_unique UNIQUE (wa_id, brigade);

-- ── RLS: brigade_admin can manage their own brigade ─────────────────────────

DROP POLICY IF EXISTS "admins_rw_whatsapp_config" ON public.whatsapp_config;
CREATE POLICY "admins_rw_whatsapp_config" ON public.whatsapp_config
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brigade_admin'::app_role))
      AND brigade = (SELECT p.brigade FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "admins_rw_whatsapp_groups" ON public.whatsapp_groups;
CREATE POLICY "admins_rw_whatsapp_groups" ON public.whatsapp_groups
  FOR ALL USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'brigade_admin'::app_role))
      AND brigade = (SELECT p.brigade FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    )
  );
