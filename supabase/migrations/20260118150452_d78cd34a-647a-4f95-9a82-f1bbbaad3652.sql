-- Table for tracking clarification talks and tests
CREATE TABLE public.safety_followups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  followup_type TEXT NOT NULL CHECK (followup_type IN ('clarification_talk', 'test')),
  followup_month DATE NOT NULL, -- The month this followup is for
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for monthly excellence winners
CREATE TABLE public.monthly_excellence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  excellence_month DATE NOT NULL, -- First day of the month
  safety_score INTEGER NOT NULL,
  kilometers NUMERIC NOT NULL,
  calculated_score NUMERIC NOT NULL, -- The weighted score used for ranking
  speed_violations INTEGER DEFAULT 0,
  accidents_count INTEGER DEFAULT 0,
  punishments_count INTEGER DEFAULT 0,
  cleaning_parades_on_time BOOLEAN DEFAULT true,
  avg_inspection_score NUMERIC,
  selected_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(excellence_month) -- Only one winner per month
);

-- Enable RLS
ALTER TABLE public.safety_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_excellence ENABLE ROW LEVEL SECURITY;

-- RLS policies for safety_followups
CREATE POLICY "Admins can manage safety followups"
ON public.safety_followups
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for monthly_excellence
CREATE POLICY "Admins can manage monthly excellence"
ON public.monthly_excellence
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view monthly excellence"
ON public.monthly_excellence
FOR SELECT
USING (auth.uid() IS NOT NULL);