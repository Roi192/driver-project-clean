-- Create accidents table for tracking driver accidents
CREATE TABLE public.accidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  accident_date DATE NOT NULL,
  driver_type TEXT NOT NULL CHECK (driver_type IN ('security', 'combat')),
  vehicle_number TEXT,
  description TEXT,
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'severe')),
  location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage accidents"
ON public.accidents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_accidents_updated_at
BEFORE UPDATE ON public.accidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();