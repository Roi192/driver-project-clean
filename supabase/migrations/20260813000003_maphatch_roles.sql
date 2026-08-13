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

-- Policies using the new enum values are in the next migration file (20260813000004)
-- because PostgreSQL does not allow using a newly-added enum value in the same transaction.
