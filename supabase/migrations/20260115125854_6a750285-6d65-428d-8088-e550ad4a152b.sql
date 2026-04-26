-- Update handle_new_user function to include personal_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with all fields
  INSERT INTO public.profiles (user_id, full_name, outpost, user_type, region, military_role, platoon, personal_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'משתמש חדש'),
    NEW.raw_user_meta_data ->> 'outpost',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'driver'),
    NEW.raw_user_meta_data ->> 'region',
    NEW.raw_user_meta_data ->> 'military_role',
    NEW.raw_user_meta_data ->> 'platoon',
    NEW.raw_user_meta_data ->> 'personal_number'
  );
  
  -- Assign default driver role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver');
  
  RETURN NEW;
END;
$function$;