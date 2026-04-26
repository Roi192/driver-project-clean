
-- Drop the old admin-only select policy
DROP POLICY "Admins can view all profiles" ON public.profiles;

-- Create new policy that includes super_admin and hagmar_admin
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'hagmar_admin'::app_role)
);