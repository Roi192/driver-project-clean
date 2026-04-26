-- Add driver_name column for manual entry (for combat drivers)
ALTER TABLE public.accidents ADD COLUMN driver_name text;

-- Make soldier_id nullable so combat drivers can have manual name entry
ALTER TABLE public.accidents ALTER COLUMN soldier_id DROP NOT NULL;