-- Add maphatch_user and maphatch_admin roles for מפח"ט department staff.
-- maphatch_user  = view-only access to safety events + know-the-area
-- maphatch_admin = same as battalion_admin for safety events (can add/edit)

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maphatch_user';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maphatch_admin';

-- Update handle_new_user trigger to assign maphatch_user when user_type = 'maphatch'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_brigade text;
  assigned_role app_role;
  assigned_user_type text;
BEGIN
  meta_brigade := COALESCE(NEW.raw_user_meta_data ->> 'brigade', 'binyamin');
  assigned_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'driver');

  IF meta_brigade = 'division' THEN
    assigned_role := 'division_user';
    assigned_user_type := 'division';
  ELSIF assigned_user_type = 'maphatch' THEN
    assigned_role := 'maphatch_user';
  ELSE
    assigned_role := 'driver';
  END IF;

  INSERT INTO public.profiles (user_id, full_name, outpost, user_type, region, military_role, platoon, personal_number, department, settlement, id_number, battalion_name, brigade)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'משתמש חדש'),
    NEW.raw_user_meta_data ->> 'outpost',
    assigned_user_type,
    NEW.raw_user_meta_data ->> 'region',
    NEW.raw_user_meta_data ->> 'military_role',
    NEW.raw_user_meta_data ->> 'platoon',
    NEW.raw_user_meta_data ->> 'personal_number',
    COALESCE(NEW.raw_user_meta_data ->> 'department', 'planag'),
    NEW.raw_user_meta_data ->> 'settlement',
    NEW.raw_user_meta_data ->> 'id_number',
    NEW.raw_user_meta_data ->> 'battalion_name',
    meta_brigade
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

-- Grant maphatch_admin INSERT/UPDATE on safety_content
DROP POLICY IF EXISTS "Managers can create safety content" ON public.safety_content;
CREATE POLICY "Managers can create safety content"
ON public.safety_content FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  has_role(auth.uid(), 'maphatch_admin'::app_role)
);

DROP POLICY IF EXISTS "Managers can update safety content" ON public.safety_content;
CREATE POLICY "Managers can update safety content"
ON public.safety_content FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  has_role(auth.uid(), 'maphatch_admin'::app_role)
);

-- Grant maphatch_admin storage access (content-images)
DROP POLICY IF EXISTS "Commanders and admins can upload content images" ON storage.objects;
CREATE POLICY "Commanders and admins can upload content images"
ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can update content images" ON storage.objects;
CREATE POLICY "Commanders and admins can update content images"
ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can delete content images" ON storage.objects;
CREATE POLICY "Commanders and admins can delete content images"
ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
);
