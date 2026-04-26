-- Add outpost column to safety_content for sector_events
ALTER TABLE public.safety_content ADD COLUMN IF NOT EXISTS outpost TEXT;