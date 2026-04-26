-- Create monthly safety scores table
CREATE TABLE public.monthly_safety_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id uuid NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  score_month date NOT NULL, -- First day of the month
  safety_score integer NOT NULL CHECK (safety_score >= 0 AND safety_score <= 100),
  kilometers numeric(10,2) DEFAULT 0,
  speed_violations integer DEFAULT 0,
  harsh_braking integer DEFAULT 0,
  harsh_turns integer DEFAULT 0,
  harsh_accelerations integer DEFAULT 0,
  illegal_overtakes integer DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(soldier_id, score_month)
);

-- Enable RLS
ALTER TABLE public.monthly_safety_scores ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage safety scores"
ON public.monthly_safety_scores
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_monthly_safety_scores_updated_at
BEFORE UPDATE ON public.monthly_safety_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_safety_scores_soldier ON public.monthly_safety_scores(soldier_id);
CREATE INDEX idx_safety_scores_month ON public.monthly_safety_scores(score_month DESC);

-- Add safety_status column to soldiers table for quick reference
ALTER TABLE public.soldiers 
ADD COLUMN IF NOT EXISTS current_safety_score integer,
ADD COLUMN IF NOT EXISTS consecutive_low_months integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS safety_status text DEFAULT 'ok' CHECK (safety_status IN ('ok', 'warning', 'critical', 'suspended'));