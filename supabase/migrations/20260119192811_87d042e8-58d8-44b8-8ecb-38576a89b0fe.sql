-- Add area_id to cleaning_parade_highlights to link highlights to specific areas
ALTER TABLE public.cleaning_parade_highlights 
ADD COLUMN area_id uuid REFERENCES public.cleaning_responsibility_areas(id) ON DELETE CASCADE;

-- Add area_id to cleaning_parade_examples to link example images to specific areas
ALTER TABLE public.cleaning_parade_examples 
ADD COLUMN area_id uuid REFERENCES public.cleaning_responsibility_areas(id) ON DELETE CASCADE;

-- Drop outpost from cleaning_parade_examples since we'll get it from the area
-- (keeping it for backward compatibility, will be nullable)
ALTER TABLE public.cleaning_parade_examples 
ALTER COLUMN outpost DROP NOT NULL;

-- Create a table for weekly soldier assignments to areas (rotation schedule)
CREATE TABLE public.cleaning_weekly_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_id uuid NOT NULL REFERENCES public.cleaning_responsibility_areas(id) ON DELETE CASCADE,
  soldier_id uuid NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(area_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.cleaning_weekly_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage weekly assignments
CREATE POLICY "Admins can manage weekly assignments" 
ON public.cleaning_weekly_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can view weekly assignments
CREATE POLICY "Authenticated users can view weekly assignments" 
ON public.cleaning_weekly_assignments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX idx_cleaning_weekly_assignments_week ON public.cleaning_weekly_assignments(week_start_date);
CREATE INDEX idx_cleaning_highlights_area ON public.cleaning_parade_highlights(area_id);
CREATE INDEX idx_cleaning_examples_area ON public.cleaning_parade_examples(area_id);