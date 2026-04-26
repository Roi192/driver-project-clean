-- Create table for trip forms (טופס טיולים לפני יציאה לבית)
CREATE TABLE public.trip_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  soldier_name TEXT NOT NULL,
  form_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weapon_reset BOOLEAN NOT NULL DEFAULT false,
  exit_briefing_by_officer BOOLEAN NOT NULL DEFAULT false,
  officer_name TEXT,
  uniform_class_a BOOLEAN NOT NULL DEFAULT false,
  personal_equipment_checked BOOLEAN NOT NULL DEFAULT false,
  vehicle_returned BOOLEAN NOT NULL DEFAULT false,
  signature TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trip_forms ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own trip forms" 
ON public.trip_forms 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trip forms" 
ON public.trip_forms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all trip forms (correct has_role signature: user_id first, then role)
CREATE POLICY "Admins can view all trip forms" 
ON public.trip_forms 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete trip forms
CREATE POLICY "Admins can delete trip forms" 
ON public.trip_forms 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trip_forms_updated_at
BEFORE UPDATE ON public.trip_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries by date
CREATE INDEX idx_trip_forms_date ON public.trip_forms(form_date);
CREATE INDEX idx_trip_forms_user_date ON public.trip_forms(user_id, form_date);