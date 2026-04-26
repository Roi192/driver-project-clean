-- Add columns to safety_content for accident sync
ALTER TABLE public.safety_content 
ADD COLUMN IF NOT EXISTS soldier_id UUID REFERENCES public.soldiers(id),
ADD COLUMN IF NOT EXISTS driver_name TEXT,
ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'minor';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_safety_content_event_type ON public.safety_content(event_type);
CREATE INDEX IF NOT EXISTS idx_safety_content_category ON public.safety_content(category);