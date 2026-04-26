
CREATE TABLE public.hagmar_readiness_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personnel_weight numeric NOT NULL DEFAULT 0.4,
  components_weight numeric NOT NULL DEFAULT 0.4,
  training_weight numeric NOT NULL DEFAULT 0.2,
  risk_threat_weight numeric NOT NULL DEFAULT 0.3,
  risk_infra_weight numeric NOT NULL DEFAULT 0.3,
  risk_response_weight numeric NOT NULL DEFAULT 0.3,
  risk_incidents_weight numeric NOT NULL DEFAULT 0.1,
  priority_risk_weight numeric NOT NULL DEFAULT 0.6,
  priority_readiness_weight numeric NOT NULL DEFAULT 0.4,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hagmar_readiness_weights ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read weights" ON public.hagmar_readiness_weights
  FOR SELECT TO authenticated USING (true);

-- Only hagmar_admin can modify
CREATE POLICY "Hagmar admins can manage weights" ON public.hagmar_readiness_weights
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'hagmar_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'hagmar_admin'));

-- Insert default row
INSERT INTO public.hagmar_readiness_weights (id) VALUES (gen_random_uuid());