-- Fix: Drop overly permissive soldiers SELECT policy that exposes phone/personal_number to all authenticated users
-- Replace with role-restricted policy: only admins and platoon commanders can query the soldiers table directly
DROP POLICY IF EXISTS "Authenticated users can view soldiers via view" ON public.soldiers;

-- Allow admins and platoon commanders to view all soldiers (they need full data)
CREATE POLICY "Admins and commanders can view soldiers"
ON public.soldiers
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platoon_commander'::app_role)
  OR has_role(auth.uid(), 'battalion_admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'hagmar_admin'::app_role)
);

-- Allow regular drivers to see only their own soldier record (matched via personal_number in profiles)
CREATE POLICY "Users can view own soldier record"
ON public.soldiers
FOR SELECT
USING (
  personal_number IN (
    SELECT p.personal_number FROM profiles p WHERE p.user_id = auth.uid()
  )
);