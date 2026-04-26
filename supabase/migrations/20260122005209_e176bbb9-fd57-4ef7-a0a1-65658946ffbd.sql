
-- Drop existing restrictive policies for safety_files
DROP POLICY IF EXISTS "Admins can create safety files" ON public.safety_files;
DROP POLICY IF EXISTS "Admins can update safety files" ON public.safety_files;
DROP POLICY IF EXISTS "Admins can delete safety files" ON public.safety_files;

-- Create new policies for safety_files that include all management roles
CREATE POLICY "Managers can create safety files" 
ON public.safety_files 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Managers can update safety files" 
ON public.safety_files 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Only admin can delete safety files" 
ON public.safety_files 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop existing restrictive policies for safety_content
DROP POLICY IF EXISTS "Admins can create safety content" ON public.safety_content;
DROP POLICY IF EXISTS "Admins can update safety content" ON public.safety_content;
DROP POLICY IF EXISTS "Admins can delete safety content" ON public.safety_content;

-- Create new policies for safety_content that include all management roles
CREATE POLICY "Managers can create safety content" 
ON public.safety_content 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Managers can update safety content" 
ON public.safety_content 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Only admin can delete safety content" 
ON public.safety_content 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop existing restrictive policy for cleaning_responsibility_areas
DROP POLICY IF EXISTS "Admins can manage cleaning areas" ON public.cleaning_responsibility_areas;

-- Create new policies for cleaning_responsibility_areas that include admin and platoon_commander
CREATE POLICY "Managers can create cleaning areas" 
ON public.cleaning_responsibility_areas 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Managers can update cleaning areas" 
ON public.cleaning_responsibility_areas 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete cleaning areas" 
ON public.cleaning_responsibility_areas 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));