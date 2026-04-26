-- Add new fields to profiles table for user types
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'driver',
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS military_role text,
ADD COLUMN IF NOT EXISTS platoon text;

-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  -- Insert profile with all fields
  INSERT INTO public.profiles (user_id, full_name, outpost, user_type, region, military_role, platoon)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'משתמש חדש'),
    NEW.raw_user_meta_data ->> 'outpost',
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'driver'),
    NEW.raw_user_meta_data ->> 'region',
    NEW.raw_user_meta_data ->> 'military_role',
    NEW.raw_user_meta_data ->> 'platoon'
  );
  
  -- Assign default driver role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'driver');
  
  RETURN NEW;
END;
$$;