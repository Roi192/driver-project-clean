-- Add event_type and driver_type columns to safety_content table for sector events
ALTER TABLE public.safety_content 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS driver_type text DEFAULT NULL;

-- Add incident_type column to accidents table to differentiate between accidents, getting stuck, and other
ALTER TABLE public.accidents 
ADD COLUMN IF NOT EXISTS incident_type text DEFAULT 'accident';

-- Update existing accidents to have 'accident' as incident type
UPDATE public.accidents SET incident_type = 'accident' WHERE incident_type IS NULL;

COMMENT ON COLUMN public.safety_content.event_type IS 'Type of safety event: accident, stuck, other';
COMMENT ON COLUMN public.safety_content.driver_type IS 'Driver type for safety events: security, combat';
COMMENT ON COLUMN public.accidents.incident_type IS 'Type of incident: accident, stuck, other';