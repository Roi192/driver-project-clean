-- Allow all management roles (admin / platoon_commander / battalion_admin) to sync events into the map table
-- while keeping DELETE restricted to admin.

-- Safety Events (map) policies
ALTER TABLE public.safety_events ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can create safety events" ON public.safety_events;
DROP POLICY IF EXISTS "Admins can update safety events" ON public.safety_events;
DROP POLICY IF EXISTS "Admins can delete safety events" ON public.safety_events;

-- Insert: managers
CREATE POLICY "Managers can create safety events"
ON public.safety_events
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platoon_commander'::app_role)
  OR has_role(auth.uid(), 'battalion_admin'::app_role)
);

-- Update: managers
CREATE POLICY "Managers can update safety events"
ON public.safety_events
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platoon_commander'::app_role)
  OR has_role(auth.uid(), 'battalion_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'platoon_commander'::app_role)
  OR has_role(auth.uid(), 'battalion_admin'::app_role)
);

-- Delete: admin only
CREATE POLICY "Only admin can delete safety events"
ON public.safety_events
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));