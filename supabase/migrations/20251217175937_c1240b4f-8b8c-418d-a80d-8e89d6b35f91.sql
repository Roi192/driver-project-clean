-- Create procedure_signatures table to track when users sign procedures
CREATE TABLE public.procedure_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  procedure_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  signature TEXT NOT NULL,
  items_checked TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procedure_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view their own signatures
CREATE POLICY "Users can view their own signatures"
  ON public.procedure_signatures
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create their own signatures
CREATE POLICY "Users can insert their own signatures"
  ON public.procedure_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all signatures
CREATE POLICY "Admins can view all signatures"
  ON public.procedure_signatures
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete signatures
CREATE POLICY "Admins can delete signatures"
  ON public.procedure_signatures
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));