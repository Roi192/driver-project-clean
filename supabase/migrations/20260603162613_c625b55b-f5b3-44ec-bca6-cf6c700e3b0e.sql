CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta_brigade text;
  assigned_role app_role;
  assigned_user_type text;
BEGIN
  meta_brigade := COALESCE(NEW.raw_user_meta_data ->> 'brigade', 'binyamin');
  assigned_user_type := COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'driver');

  IF meta_brigade = 'division' THEN
    assigned_role := 'division_admin';
    assigned_user_type := 'division';
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
$function$;

-- Also update auto_fill_brigade so 'division' brigade is preserved (not forced to binyamin)
CREATE OR REPLACE FUNCTION public.auto_fill_brigade()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_brigade text;
  outpost_brigade text;
  row_data jsonb;
BEGIN
  user_brigade := public.get_user_brigade(auth.uid());
  row_data := to_jsonb(NEW);

  IF row_data ? 'outpost' AND COALESCE(row_data ->> 'outpost', '') <> '' THEN
    SELECT bo.brigade
    INTO outpost_brigade
    FROM public.brigade_outposts bo
    WHERE bo.name = row_data ->> 'outpost'
    ORDER BY CASE WHEN bo.brigade = user_brigade THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  IF NEW.brigade IS NULL
     OR NEW.brigade = ''
     OR (
       NEW.brigade = 'binyamin'
       AND COALESCE(outpost_brigade, user_brigade) IS NOT NULL
       AND COALESCE(outpost_brigade, user_brigade) NOT IN ('binyamin')
       AND user_brigade <> 'division'
     ) THEN
    NEW.brigade := COALESCE(outpost_brigade, user_brigade, 'binyamin');
  END IF;

  RETURN NEW;
END;
$function$;