
-- Editable warning categories
CREATE TABLE public.warning_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.warning_categories TO authenticated;
GRANT ALL ON public.warning_categories TO service_role;

ALTER TABLE public.warning_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view categories" ON public.warning_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and commanders can insert categories" ON public.warning_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can update categories" ON public.warning_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));
CREATE POLICY "Admins and commanders can delete categories" ON public.warning_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- Seed with the original default categories
INSERT INTO public.warning_categories (name, sort_order) VALUES
  ('איחור לכינוס נהגים', 1),
  ('אי-מילוי טופס יציאה', 2),
  ('אי-ביצוע תדריך יציאה', 3),
  ('אי-הקפדה על ציוד', 4),
  ('התנהגות / משמעת', 5),
  ('אי-הופעה למשימה', 6),
  ('אחר', 99);

-- Add soldier signature columns
ALTER TABLE public.soldier_warnings
  ADD COLUMN IF NOT EXISTS soldier_signature TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

-- Allow soldiers to view & sign their own warnings
CREATE POLICY "Soldiers can view own warnings" ON public.soldier_warnings FOR SELECT TO authenticated
  USING (
    soldier_id IN (
      SELECT s.id FROM public.soldiers s
      JOIN public.profiles p ON p.personal_number = s.personal_number
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Soldiers can sign own warnings" ON public.soldier_warnings FOR UPDATE TO authenticated
  USING (
    soldier_id IN (
      SELECT s.id FROM public.soldiers s
      JOIN public.profiles p ON p.personal_number = s.personal_number
      WHERE p.user_id = auth.uid()
    )
  );