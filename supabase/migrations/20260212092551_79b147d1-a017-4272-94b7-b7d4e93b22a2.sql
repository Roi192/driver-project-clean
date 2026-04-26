
-- Weekend weapon holders tracking for HAGMAR department
CREATE TABLE public.weekend_weapon_holders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE NOT NULL,
  weekend_date DATE NOT NULL,
  settlement TEXT NOT NULL,
  is_holding_weapon BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(soldier_id, weekend_date)
);

ALTER TABLE public.weekend_weapon_holders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view weekend weapon holders"
ON public.weekend_weapon_holders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert weekend weapon holders"
ON public.weekend_weapon_holders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekend weapon holders"
ON public.weekend_weapon_holders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete weekend weapon holders"
ON public.weekend_weapon_holders FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_weekend_weapon_holders_updated_at
BEFORE UPDATE ON public.weekend_weapon_holders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();