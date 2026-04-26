-- Drop old reference photos table structure (will recreate with new schema)
DROP TABLE IF EXISTS public.cleaning_reference_photos CASCADE;

-- Create new reference photos table - linked to checklist items
CREATE TABLE public.cleaning_reference_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_item_id UUID REFERENCES public.cleaning_checklist_items(id) ON DELETE CASCADE,
  outpost TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_cleaning_ref_photos_item ON public.cleaning_reference_photos(checklist_item_id);
CREATE INDEX idx_cleaning_ref_photos_outpost ON public.cleaning_reference_photos(outpost);

-- Enable RLS
ALTER TABLE public.cleaning_reference_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view reference photos"
ON public.cleaning_reference_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Managers can manage reference photos"
ON public.cleaning_reference_photos FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- Add cleaning schedule notifications table for tracking sent notifications
CREATE TABLE IF NOT EXISTS public.cleaning_notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE,
  outpost TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  week_start_date DATE NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'reminder',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(soldier_id, outpost, day_of_week, week_start_date, notification_type)
);

ALTER TABLE public.cleaning_notifications_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view cleaning notifications log"
ON public.cleaning_notifications_log FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "System can insert cleaning notifications"
ON public.cleaning_notifications_log FOR INSERT
TO authenticated
WITH CHECK (true);