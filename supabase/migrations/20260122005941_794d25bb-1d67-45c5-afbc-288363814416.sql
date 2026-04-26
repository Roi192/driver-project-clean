
-- Fix cleaning_weekly_assignments RLS - allow platoon_commander to manage assignments
DROP POLICY IF EXISTS "Admins can manage weekly assignments" ON public.cleaning_weekly_assignments;

-- Allow managers to view assignments
CREATE POLICY "Managers can view weekly assignments" 
ON public.cleaning_weekly_assignments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow admin and platoon_commander to insert assignments
CREATE POLICY "Managers can insert weekly assignments" 
ON public.cleaning_weekly_assignments 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- Allow admin and platoon_commander to update assignments
CREATE POLICY "Managers can update weekly assignments" 
ON public.cleaning_weekly_assignments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- Allow admin and platoon_commander to delete assignments (needed for reassignment)
CREATE POLICY "Managers can delete weekly assignments" 
ON public.cleaning_weekly_assignments 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);