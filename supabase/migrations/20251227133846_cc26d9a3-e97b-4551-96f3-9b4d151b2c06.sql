-- Create sector_boundaries table for storing sector boundary polygons
CREATE TABLE public.sector_boundaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  boundary_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  color TEXT DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sector_boundaries ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view sector boundaries
CREATE POLICY "Authenticated users can view sector boundaries"
ON public.sector_boundaries
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage sector boundaries
CREATE POLICY "Admins can manage sector boundaries"
ON public.sector_boundaries
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_sector_boundaries_updated_at
BEFORE UPDATE ON public.sector_boundaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();