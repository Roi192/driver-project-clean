ALTER TABLE public.safety_content
  ADD COLUMN IF NOT EXISTS vehicle_model          TEXT,
  ADD COLUMN IF NOT EXISTS population_type        TEXT,
  ADD COLUMN IF NOT EXISTS culpability            TEXT,
  ADD COLUMN IF NOT EXISTS damage_and_casualties  TEXT;
