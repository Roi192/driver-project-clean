-- Create new safety_content table for the restructured safety events section
CREATE TABLE public.safety_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('flag_investigations', 'sector_events', 'neighbor_events', 'monthly_summaries')),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  file_url TEXT,
  event_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.safety_content ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view safety content"
ON public.safety_content
FOR SELECT
USING (true);

CREATE POLICY "Admins can create safety content"
ON public.safety_content
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update safety content"
ON public.safety_content
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete safety content"
ON public.safety_content
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_safety_content_updated_at
BEFORE UPDATE ON public.safety_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add instructions column to drill_locations table for admin to edit drill instructions
ALTER TABLE public.drill_locations ADD COLUMN IF NOT EXISTS instructions TEXT;