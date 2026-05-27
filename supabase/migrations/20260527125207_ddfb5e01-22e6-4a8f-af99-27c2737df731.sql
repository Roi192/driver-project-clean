CREATE TABLE public.exit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date DATE NOT NULL,
  request_type TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  decision_notes TEXT,
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exit_requests TO authenticated;
GRANT ALL ON public.exit_requests TO service_role;

ALTER TABLE public.exit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and platoon commanders can view exit requests"
ON public.exit_requests FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platoon_commander')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins and platoon commanders can insert exit requests"
ON public.exit_requests FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platoon_commander')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins and platoon commanders can update exit requests"
ON public.exit_requests FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platoon_commander')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins and platoon commanders can delete exit requests"
ON public.exit_requests FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platoon_commander')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE TRIGGER update_exit_requests_updated_at
BEFORE UPDATE ON public.exit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_exit_requests_soldier_id ON public.exit_requests(soldier_id);
CREATE INDEX idx_exit_requests_exit_date ON public.exit_requests(exit_date DESC);
CREATE INDEX idx_exit_requests_status ON public.exit_requests(status);