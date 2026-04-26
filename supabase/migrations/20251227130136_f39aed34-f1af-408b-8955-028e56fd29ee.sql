-- Add latitude and longitude columns to safety_events table for map display
ALTER TABLE public.safety_events ADD COLUMN latitude numeric;
ALTER TABLE public.safety_events ADD COLUMN longitude numeric;