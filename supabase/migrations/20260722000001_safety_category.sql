ALTER TABLE public.safety_content
  ADD COLUMN IF NOT EXISTS safety_category TEXT;
