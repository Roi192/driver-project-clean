DROP POLICY IF EXISTS "Division admins can create safety content" ON public.safety_content;
CREATE POLICY "Division admins can create safety content"
ON public.safety_content
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_division_admin(auth.uid()));

DROP POLICY IF EXISTS "Division admins can update safety content" ON public.safety_content;
CREATE POLICY "Division admins can update safety content"
ON public.safety_content
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_division_admin(auth.uid()))
WITH CHECK (public.is_division_admin(auth.uid()));

DROP POLICY IF EXISTS "Division admins can create safety events" ON public.safety_events;
CREATE POLICY "Division admins can create safety events"
ON public.safety_events
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_division_admin(auth.uid()));

DROP POLICY IF EXISTS "Division admins can update safety events" ON public.safety_events;
CREATE POLICY "Division admins can update safety events"
ON public.safety_events
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_division_admin(auth.uid()))
WITH CHECK (public.is_division_admin(auth.uid()));

DROP POLICY IF EXISTS "Division admins can create accidents" ON public.accidents;
CREATE POLICY "Division admins can create accidents"
ON public.accidents
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (public.is_division_admin(auth.uid()));

DROP POLICY IF EXISTS "Division admins can update accidents" ON public.accidents;
CREATE POLICY "Division admins can update accidents"
ON public.accidents
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (public.is_division_admin(auth.uid()))
WITH CHECK (public.is_division_admin(auth.uid()));