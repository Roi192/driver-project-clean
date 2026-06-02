
-- Add brigade columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS brigade TEXT NOT NULL DEFAULT 'binyamin';
ALTER TABLE public.safety_events ADD COLUMN IF NOT EXISTS brigade TEXT NOT NULL DEFAULT 'binyamin';
ALTER TABLE public.accidents ADD COLUMN IF NOT EXISTS brigade TEXT NOT NULL DEFAULT 'binyamin';
ALTER TABLE public.safety_content ADD COLUMN IF NOT EXISTS brigade TEXT NOT NULL DEFAULT 'binyamin';

-- Helper: get user's brigade
CREATE OR REPLACE FUNCTION public.get_user_brigade(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT brigade FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Helper: is division-level admin (mafaog iyosh) or super_admin
CREATE OR REPLACE FUNCTION public.is_division_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('division_admin', 'super_admin')
  )
$$;

-- Update handle_new_user to capture brigade
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, outpost, user_type, region, military_role, platoon, personal_number, department, settlement, id_number, battalion_name, brigade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'משתמש חדש'),
    NEW.raw_user_meta_data ->> 'outpost',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'driver'),
    NEW.raw_user_meta_data ->> 'region',
    NEW.raw_user_meta_data ->> 'military_role',
    NEW.raw_user_meta_data ->> 'platoon',
    NEW.raw_user_meta_data ->> 'personal_number',
    COALESCE(NEW.raw_user_meta_data ->> 'department', 'planag'),
    NEW.raw_user_meta_data ->> 'settlement',
    NEW.raw_user_meta_data ->> 'id_number',
    NEW.raw_user_meta_data ->> 'battalion_name',
    COALESCE(NEW.raw_user_meta_data ->> 'brigade', 'binyamin')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver');
  RETURN NEW;
END;
$$;

-- Cross-brigade READ for safety events & accidents (so all brigades see "neighbouring sector" events)
DROP POLICY IF EXISTS "Cross-brigade safety events read" ON public.safety_events;
CREATE POLICY "Cross-brigade safety events read"
ON public.safety_events
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Cross-brigade accidents read" ON public.accidents;
CREATE POLICY "Cross-brigade accidents read"
ON public.accidents
FOR SELECT
TO authenticated
USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_brigade ON public.profiles(brigade);
CREATE INDEX IF NOT EXISTS idx_safety_events_brigade ON public.safety_events(brigade);
CREATE INDEX IF NOT EXISTS idx_accidents_brigade ON public.accidents(brigade);
CREATE INDEX IF NOT EXISTS idx_safety_content_brigade ON public.safety_content(brigade);