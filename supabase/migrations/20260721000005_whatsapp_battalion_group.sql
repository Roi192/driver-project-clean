-- Add battalion_name to whatsapp_groups for battalion-specific routing
-- is_global = true  → brigade group (receives ALL events from all users)
-- is_global = false → battalion group (receives only events where battalion_name matches)
ALTER TABLE public.whatsapp_groups
  ADD COLUMN IF NOT EXISTS battalion_name TEXT;
