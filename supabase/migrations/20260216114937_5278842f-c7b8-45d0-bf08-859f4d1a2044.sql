
CREATE TABLE public.content_cycle_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  content_cycle TEXT NOT NULL,
  override_type TEXT NOT NULL CHECK (override_type IN ('completed', 'absent')),
  completion_date DATE,
  absence_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_cycle_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and platoon commanders can manage content cycle overrides"
ON public.content_cycle_overrides FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE UNIQUE INDEX idx_content_cycle_overrides_unique 
ON public.content_cycle_overrides(soldier_id, content_cycle);