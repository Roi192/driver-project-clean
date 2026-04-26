-- Create table for MP (Company Commander) weekly notes
CREATE TABLE public.mp_weekly_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start_date DATE NOT NULL,
  general_notes TEXT,
  region_emphases JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(week_start_date)
);

-- Enable RLS
ALTER TABLE public.mp_weekly_notes ENABLE ROW LEVEL SECURITY;

-- Only admin can manage MP notes
CREATE POLICY "Admins can manage MP notes"
  ON public.mp_weekly_notes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Platoon commanders can read (to see the summary)
CREATE POLICY "Platoon commanders can read MP notes"
  ON public.mp_weekly_notes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'platoon_commander'));

-- Add trigger for updated_at
CREATE TRIGGER update_mp_weekly_notes_updated_at
  BEFORE UPDATE ON public.mp_weekly_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();