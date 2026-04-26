-- =====================================================
-- CLEANING PARADE SYSTEM REDESIGN
-- New: Outpost-based checklist with photos per item
-- =====================================================

-- Drop old assignment tables (will rebuild)
DROP TABLE IF EXISTS public.cleaning_parade_assignments CASCADE;
DROP TABLE IF EXISTS public.cleaning_weekly_assignments CASCADE;
DROP TABLE IF EXISTS public.cleaning_parade_highlights CASCADE;
DROP TABLE IF EXISTS public.cleaning_parade_examples CASCADE;
DROP TABLE IF EXISTS public.cleaning_responsibility_areas CASCADE;

-- =====================================================
-- 1. CHECKLIST ITEMS - Master list per outpost
-- =====================================================
CREATE TABLE public.cleaning_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpost TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view checklist items"
ON public.cleaning_checklist_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage checklist items"
ON public.cleaning_checklist_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- =====================================================
-- 2. REFERENCE PHOTOS - How room should look per outpost
-- =====================================================
CREATE TABLE public.cleaning_reference_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpost TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cleaning_reference_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view reference photos"
ON public.cleaning_reference_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage reference photos"
ON public.cleaning_reference_photos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- =====================================================
-- 3. PARADE SUBMISSIONS - Main parade record
-- =====================================================
CREATE TABLE public.cleaning_parade_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  outpost TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'wednesday', 'saturday_night')),
  parade_date DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Unique: one parade per soldier per outpost per day per date
  UNIQUE(soldier_id, outpost, day_of_week, parade_date)
);

ALTER TABLE public.cleaning_parade_submissions ENABLE ROW LEVEL SECURITY;

-- Soldiers can insert their own submissions
CREATE POLICY "Soldiers can create their own submissions"
ON public.cleaning_parade_submissions FOR INSERT
TO authenticated
WITH CHECK (true);

-- Soldiers can view their own, managers can view all
CREATE POLICY "Users can view submissions"
ON public.cleaning_parade_submissions FOR SELECT
TO authenticated
USING (
  soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON s.personal_number = p.personal_number
    WHERE p.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platoon_commander')
);

-- Soldiers can update their own incomplete submissions
CREATE POLICY "Soldiers can update their own submissions"
ON public.cleaning_parade_submissions FOR UPDATE
TO authenticated
USING (
  soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON s.personal_number = p.personal_number
    WHERE p.user_id = auth.uid()
  )
);

-- =====================================================
-- 4. CHECKLIST COMPLETIONS - Photo per item
-- =====================================================
CREATE TABLE public.cleaning_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.cleaning_parade_submissions(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.cleaning_checklist_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Each item completed once per submission
  UNIQUE(submission_id, checklist_item_id)
);

ALTER TABLE public.cleaning_checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Soldiers can create checklist completions"
ON public.cleaning_checklist_completions FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view checklist completions"
ON public.cleaning_checklist_completions FOR SELECT
TO authenticated
USING (
  submission_id IN (
    SELECT ps.id FROM cleaning_parade_submissions ps
    WHERE ps.soldier_id IN (
      SELECT s.id FROM soldiers s
      JOIN profiles p ON s.personal_number = p.personal_number
      WHERE p.user_id = auth.uid()
    )
  )
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'platoon_commander')
);

-- =====================================================
-- 5. MANUAL ASSIGNMENTS - Override when no work schedule
-- =====================================================
CREATE TABLE public.cleaning_manual_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  outpost TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('monday', 'wednesday', 'saturday_night')),
  week_start_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- One assignment per outpost per day per week
  UNIQUE(outpost, day_of_week, week_start_date)
);

ALTER TABLE public.cleaning_manual_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view manual assignments"
ON public.cleaning_manual_assignments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage manual assignments"
ON public.cleaning_manual_assignments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- =====================================================
-- 6. DEFAULT CHECKLIST ITEMS (Insert for each outpost)
-- =====================================================
DO $$
DECLARE
  outpost_name TEXT;
  default_items TEXT[] := ARRAY[
    'ריקון פחים',
    'סידור ארוניות וניקוי אבק מעל הארוניות',
    'שטיפת החדר',
    'סידור מצעים',
    'ניקוי מקרר',
    'ניקוי מזגן ופילטרים',
    'ניקוי חלונות',
    'שירותים ומקלחת - אסלה, כיור, רצפה',
    'פינוי פחים'
  ];
  item_text TEXT;
  item_order INTEGER;
BEGIN
  FOREACH outpost_name IN ARRAY ARRAY[
    'חשמונאים', 'כוכב יעקב', 'רמה', 'ענתות', 'בית אל', 
    'עפרה', 'מבו"ש', 'עטרת', 'חורש ירון', 'נווה יאיר', 
    'רנתיס', 'מכבים'
  ]
  LOOP
    item_order := 0;
    FOREACH item_text IN ARRAY default_items
    LOOP
      INSERT INTO public.cleaning_checklist_items (outpost, item_name, item_order)
      VALUES (outpost_name, item_text, item_order)
      ON CONFLICT DO NOTHING;
      item_order := item_order + 1;
    END LOOP;
  END LOOP;
END $$;