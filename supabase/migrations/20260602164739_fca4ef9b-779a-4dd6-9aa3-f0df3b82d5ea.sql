-- Brigade-scoped outposts table
CREATE TABLE public.brigade_outposts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brigade TEXT NOT NULL,
  name TEXT NOT NULL,
  region TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (brigade, name)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.brigade_outposts TO authenticated;
GRANT ALL ON public.brigade_outposts TO service_role;

ALTER TABLE public.brigade_outposts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (cross-brigade visibility for safety events use cases)
CREATE POLICY "Authenticated can view brigade outposts"
ON public.brigade_outposts FOR SELECT
TO authenticated
USING (true);

-- Admins / platoon_commander of the brigade, plus division_admin / super_admin, can manage
CREATE POLICY "Brigade managers can insert outposts"
ON public.brigade_outposts FOR INSERT
TO authenticated
WITH CHECK (
  public.is_division_admin(auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'))
    AND brigade = public.get_user_brigade(auth.uid())
  )
);

CREATE POLICY "Brigade managers can update outposts"
ON public.brigade_outposts FOR UPDATE
TO authenticated
USING (
  public.is_division_admin(auth.uid())
  OR (
    (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'))
    AND brigade = public.get_user_brigade(auth.uid())
  )
);

CREATE POLICY "Brigade managers can delete outposts"
ON public.brigade_outposts FOR DELETE
TO authenticated
USING (
  public.is_division_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin')
    AND brigade = public.get_user_brigade(auth.uid())
  )
);

CREATE TRIGGER update_brigade_outposts_updated_at
BEFORE UPDATE ON public.brigade_outposts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_brigade_outposts_brigade ON public.brigade_outposts(brigade);

-- Seed Binyamin's current 12 outposts (preserves existing app behavior)
INSERT INTO public.brigade_outposts (brigade, name, region) VALUES
  ('binyamin', 'חשמונאים', 'מכבים'),
  ('binyamin', 'כוכב יעקב', 'גבעת בנימין'),
  ('binyamin', 'רמה', 'גבעת בנימין'),
  ('binyamin', 'ענתות', 'גבעת בנימין'),
  ('binyamin', 'בית אל', 'ארץ בנימין'),
  ('binyamin', 'עפרה', 'ארץ בנימין'),
  ('binyamin', 'מבו"ש', 'ארץ בנימין'),
  ('binyamin', 'עטרת', 'ארץ בנימין'),
  ('binyamin', 'חורש ירון', 'טלמונים'),
  ('binyamin', 'נווה יאיר', 'טלמונים'),
  ('binyamin', 'רנתיס', 'טלמונים'),
  ('binyamin', 'מכבים', 'מכבים');

-- Add brigade scoping to drill_locations and safety_files so each brigade has its own
ALTER TABLE public.drill_locations
  ADD COLUMN brigade TEXT NOT NULL DEFAULT 'binyamin';
CREATE INDEX idx_drill_locations_brigade ON public.drill_locations(brigade);

ALTER TABLE public.safety_files
  ADD COLUMN brigade TEXT NOT NULL DEFAULT 'binyamin';
CREATE INDEX idx_safety_files_brigade ON public.safety_files(brigade);