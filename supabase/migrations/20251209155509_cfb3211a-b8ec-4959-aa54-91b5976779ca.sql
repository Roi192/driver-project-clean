
-- Create enum for shift types
CREATE TYPE public.shift_type AS ENUM ('morning', 'afternoon', 'evening');

-- Create enum for drill types
CREATE TYPE public.drill_type AS ENUM ('descent', 'rollover', 'fire');

-- Create enum for safety file categories
CREATE TYPE public.safety_category AS ENUM ('vardim', 'vulnerability', 'parsa');

-- Create enum for safety event categories
CREATE TYPE public.safety_event_category AS ENUM ('fire', 'accident', 'weapon', 'vehicle', 'other');

-- =====================
-- SHIFT REPORTS TABLE
-- =====================
CREATE TABLE public.shift_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Step 1: General Details
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  report_time TIME NOT NULL DEFAULT CURRENT_TIME,
  outpost TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  vehicle_number TEXT NOT NULL,
  shift_type shift_type NOT NULL,
  
  -- Step 2: Briefings
  emergency_procedure_participation BOOLEAN DEFAULT false,
  commander_briefing_attendance BOOLEAN DEFAULT false,
  work_card_completed BOOLEAN DEFAULT false,
  
  -- Step 3: Equipment & Readiness
  has_ceramic_vest BOOLEAN DEFAULT false,
  has_helmet BOOLEAN DEFAULT false,
  has_personal_weapon BOOLEAN DEFAULT false,
  has_ammunition BOOLEAN DEFAULT false,
  pre_movement_checks_completed BOOLEAN DEFAULT false,
  driver_tools_checked BOOLEAN DEFAULT false,
  
  -- Step 4: Drills
  descent_drill_completed BOOLEAN DEFAULT false,
  rollover_drill_completed BOOLEAN DEFAULT false,
  fire_drill_completed BOOLEAN DEFAULT false,
  safety_vulnerabilities TEXT,
  vardim_procedure_explanation TEXT,
  vardim_points TEXT,
  
  -- Step 5: Photos (stored as URLs from storage)
  photo_front TEXT,
  photo_left TEXT,
  photo_right TEXT,
  photo_back TEXT,
  photo_steering_wheel TEXT,
  
  -- Metadata
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;

-- Drivers can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.shift_reports FOR SELECT
USING (auth.uid() = user_id);

-- Drivers can create their own reports
CREATE POLICY "Users can create their own reports"
ON public.shift_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Drivers can update their own reports
CREATE POLICY "Users can update their own reports"
ON public.shift_reports FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
ON public.shift_reports FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update all reports
CREATE POLICY "Admins can update all reports"
ON public.shift_reports FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins can delete reports
CREATE POLICY "Admins can delete reports"
ON public.shift_reports FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_shift_reports_updated_at
BEFORE UPDATE ON public.shift_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- DRILL LOCATIONS TABLE
-- =====================
CREATE TABLE public.drill_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpost TEXT NOT NULL,
  drill_type drill_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.drill_locations ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view drill locations
CREATE POLICY "Authenticated users can view drill locations"
ON public.drill_locations FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can create drill locations"
ON public.drill_locations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update drill locations"
ON public.drill_locations FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete drill locations"
ON public.drill_locations FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_drill_locations_updated_at
BEFORE UPDATE ON public.drill_locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SAFETY FILES TABLE
-- =====================
CREATE TABLE public.safety_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpost TEXT NOT NULL,
  category safety_category NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_files ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view safety files"
ON public.safety_files FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can create safety files"
ON public.safety_files FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update safety files"
ON public.safety_files FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete safety files"
ON public.safety_files FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_safety_files_updated_at
BEFORE UPDATE ON public.safety_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- SAFETY EVENTS TABLE
-- =====================
CREATE TABLE public.safety_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category safety_event_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  lessons_learned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view
CREATE POLICY "Authenticated users can view safety events"
ON public.safety_events FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can create safety events"
ON public.safety_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update safety events"
ON public.safety_events FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete safety events"
ON public.safety_events FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_safety_events_updated_at
BEFORE UPDATE ON public.safety_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================
-- STORAGE BUCKET FOR PHOTOS
-- =====================
INSERT INTO storage.buckets (id, name, public) VALUES ('shift-photos', 'shift-photos', true);

-- Storage policies for shift photos
CREATE POLICY "Authenticated users can upload shift photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shift-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'shift-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all shift photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'shift-photos' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'shift-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shift-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete any shift photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'shift-photos' AND has_role(auth.uid(), 'admin'));
