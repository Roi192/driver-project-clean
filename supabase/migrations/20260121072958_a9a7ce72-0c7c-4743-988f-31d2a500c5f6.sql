-- Fix security issue: Restrict soldiers table access
-- Currently any authenticated user can view all soldiers data
-- We need to restrict access so:
-- 1. Admins can still view all soldiers
-- 2. Regular users can only see soldiers matching their profile's personal_number

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view soldiers via view" ON public.soldiers;

-- Create a new restrictive SELECT policy for soldiers
-- Users can only view their own soldier record (matched by personal_number from their profile)
CREATE POLICY "Users can view their own soldier record" 
ON public.soldiers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.personal_number = soldiers.personal_number
  )
);

-- Fix security issue: Add verification for profiles table
-- Ensure user_id in profiles actually matches the authenticated user
-- The existing policies are already correct, but let's add a trigger to ensure
-- profile user_id matches auth.users

-- Create a function to verify profile user_id exists in auth.users
CREATE OR REPLACE FUNCTION public.verify_profile_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Verify that the user_id being inserted matches the authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot create profile for another user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to enforce user_id verification on INSERT
DROP TRIGGER IF EXISTS enforce_profile_user_id ON public.profiles;
CREATE TRIGGER enforce_profile_user_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.verify_profile_user_id();