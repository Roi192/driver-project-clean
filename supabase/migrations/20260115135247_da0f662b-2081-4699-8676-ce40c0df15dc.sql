-- Create driver interviews table
CREATE TABLE public.driver_interviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  interview_date date NOT NULL DEFAULT CURRENT_DATE,
  region text NOT NULL,
  battalion text NOT NULL,
  outpost text NOT NULL,
  soldier_id uuid REFERENCES public.soldiers(id),
  driver_name text NOT NULL,
  
  -- Driver characteristics (some auto-filled from soldiers table)
  civilian_license_expiry date,
  license_type text,
  military_license_expiry date,
  permits text,
  defensive_driving_passed boolean DEFAULT false,
  military_accidents text,
  
  -- Interview questions
  family_status text,
  financial_status text,
  additional_notes text,
  interviewer_summary text,
  
  -- Interviewer details
  interviewer_name text NOT NULL,
  signature text NOT NULL,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.driver_interviews ENABLE ROW LEVEL SECURITY;

-- Create policies - battalion users can create and view their own interviews
CREATE POLICY "Users can create their own interviews"
ON public.driver_interviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own interviews"
ON public.driver_interviews
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews"
ON public.driver_interviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all interviews"
ON public.driver_interviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_driver_interviews_updated_at
BEFORE UPDATE ON public.driver_interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_driver_interviews_user ON public.driver_interviews(user_id);
CREATE INDEX idx_driver_interviews_date ON public.driver_interviews(interview_date DESC);
CREATE INDEX idx_driver_interviews_soldier ON public.driver_interviews(soldier_id);