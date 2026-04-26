-- Drop existing policies on soldiers table
DROP POLICY IF EXISTS "Admins can manage soldiers" ON public.soldiers;
DROP POLICY IF EXISTS "Users can view their own soldier record" ON public.soldiers;

-- Create new policies that allow all admin roles to view soldiers

-- SELECT policy: Admin, Platoon Commander, and Battalion Admin can view all soldiers
-- Regular users can only view their own record
CREATE POLICY "Admin roles can view all soldiers" 
ON public.soldiers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.personal_number = soldiers.personal_number
  )
);

-- INSERT policy: Admin and Platoon Commander can add soldiers
CREATE POLICY "Admin and platoon commander can add soldiers" 
ON public.soldiers 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- UPDATE policy: Admin and Platoon Commander can update soldiers
CREATE POLICY "Admin and platoon commander can update soldiers" 
ON public.soldiers 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- DELETE policy: Only Admin can delete soldiers
CREATE POLICY "Only admin can delete soldiers" 
ON public.soldiers 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));