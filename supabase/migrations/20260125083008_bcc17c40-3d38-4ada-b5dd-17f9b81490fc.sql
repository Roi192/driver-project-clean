-- Fix RLS so managers (not only admins) can INSERT/UPDATE/DELETE cleaning item assignments
DROP POLICY IF EXISTS "Admins can manage item assignments" ON public.cleaning_item_assignments;

CREATE POLICY "Managers can manage item assignments"
ON public.cleaning_item_assignments
FOR ALL
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