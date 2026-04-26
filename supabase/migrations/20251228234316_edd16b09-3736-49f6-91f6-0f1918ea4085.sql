-- Add latitude and longitude columns to safety_content for sector events
ALTER TABLE public.safety_content 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;