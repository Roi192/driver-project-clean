-- Update RLS policies for punishments table - allow platoon_commander to view and add
DROP POLICY IF EXISTS "Admins can manage punishments" ON public.punishments;

CREATE POLICY "Admin roles can view punishments" 
ON public.punishments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Admin and platoon commander can add punishments" 
ON public.punishments 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can update punishments" 
ON public.punishments 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete punishments" 
ON public.punishments 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for accidents table
DROP POLICY IF EXISTS "Admins can manage accidents" ON public.accidents;

CREATE POLICY "Admin roles can view accidents" 
ON public.accidents 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Admin and platoon commander can add accidents" 
ON public.accidents 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can update accidents" 
ON public.accidents 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete accidents" 
ON public.accidents 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for inspections table
DROP POLICY IF EXISTS "Admins can manage inspections" ON public.inspections;

CREATE POLICY "Admin roles can view inspections" 
ON public.inspections 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Admin and platoon commander can add inspections" 
ON public.inspections 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can update inspections" 
ON public.inspections 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete inspections" 
ON public.inspections 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for monthly_safety_scores table
DROP POLICY IF EXISTS "Admins can manage safety scores" ON public.monthly_safety_scores;

CREATE POLICY "Admin roles can view safety scores" 
ON public.monthly_safety_scores 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Admin and platoon commander can add safety scores" 
ON public.monthly_safety_scores 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can update safety scores" 
ON public.monthly_safety_scores 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete safety scores" 
ON public.monthly_safety_scores 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for work_plan_events table
DROP POLICY IF EXISTS "Admins can create work plan events" ON public.work_plan_events;
DROP POLICY IF EXISTS "Admins can delete work plan events" ON public.work_plan_events;
DROP POLICY IF EXISTS "Admins can update work plan events" ON public.work_plan_events;
DROP POLICY IF EXISTS "Admins can view work plan events" ON public.work_plan_events;

CREATE POLICY "Admin roles can view work plan events" 
ON public.work_plan_events 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can add work plan events" 
ON public.work_plan_events 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can update work plan events" 
ON public.work_plan_events 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete work plan events" 
ON public.work_plan_events 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS policies for safety_followups table
DROP POLICY IF EXISTS "Admins can manage safety followups" ON public.safety_followups;

CREATE POLICY "Admin roles can view safety followups" 
ON public.safety_followups 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role) OR 
  has_role(auth.uid(), 'battalion_admin'::app_role)
);

CREATE POLICY "Admin and platoon commander can add safety followups" 
ON public.safety_followups 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Admin and platoon commander can update safety followups" 
ON public.safety_followups 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

CREATE POLICY "Only admin can delete safety followups" 
ON public.safety_followups 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));