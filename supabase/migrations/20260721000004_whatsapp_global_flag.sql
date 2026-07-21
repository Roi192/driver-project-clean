-- Add is_global flag to whatsapp_groups
-- Global groups receive all safety events system-wide regardless of brigade
ALTER TABLE public.whatsapp_groups
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;
