-- Create responsibility areas table for grouping checklist items
CREATE TABLE public.cleaning_responsibility_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outpost TEXT NOT NULL,
  name TEXT NOT NULL,
  shift_day TEXT, -- e.g., 'sunday', 'monday'
  shift_type TEXT, -- 'morning', 'afternoon', 'evening'
  deadline_time TIME, -- e.g., '14:00'
  manual_soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add responsibility_area_id to checklist items
ALTER TABLE public.cleaning_checklist_items 
ADD COLUMN responsibility_area_id UUID REFERENCES public.cleaning_responsibility_areas(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.cleaning_responsibility_areas ENABLE ROW LEVEL SECURITY;

-- Create policies for responsibility areas
CREATE POLICY "Anyone can view responsibility areas" 
ON public.cleaning_responsibility_areas 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and platoon commanders can manage responsibility areas" 
ON public.cleaning_responsibility_areas 
FOR ALL 
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'platoon_commander')
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cleaning_responsibility_areas_updated_at
BEFORE UPDATE ON public.cleaning_responsibility_areas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();