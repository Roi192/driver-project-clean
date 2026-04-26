
-- Security incidents table for HAGMAR
CREATE TABLE public.hagmar_security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement TEXT NOT NULL,
  region TEXT,
  company TEXT,
  incident_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  incident_type TEXT NOT NULL DEFAULT 'other',
  severity TEXT NOT NULL DEFAULT 'low',
  title TEXT NOT NULL,
  description TEXT,
  location_details TEXT,
  reported_by TEXT,
  reported_by_user_id UUID,
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  photos TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hagmar_security_incidents ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "hagmar_incidents_admin_all" ON public.hagmar_security_incidents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'hagmar_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'hagmar_admin'::app_role));

-- Ravshatz: view/insert for own settlement
CREATE POLICY "hagmar_incidents_ravshatz_select" ON public.hagmar_security_incidents
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'ravshatz'::app_role) AND
    settlement IN (SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid())
  );

CREATE POLICY "hagmar_incidents_ravshatz_insert" ON public.hagmar_security_incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'ravshatz'::app_role) AND
    settlement IN (SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid())
  );

-- Regular hagmar users can view their settlement and insert reports
CREATE POLICY "hagmar_incidents_user_select" ON public.hagmar_security_incidents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.department = 'hagmar' AND p.settlement = hagmar_security_incidents.settlement)
  );

CREATE POLICY "hagmar_incidents_user_insert" ON public.hagmar_security_incidents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.department = 'hagmar' AND p.settlement = hagmar_security_incidents.settlement)
  );

-- Trigger for updated_at
CREATE TRIGGER update_hagmar_security_incidents_updated_at
  BEFORE UPDATE ON public.hagmar_security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();