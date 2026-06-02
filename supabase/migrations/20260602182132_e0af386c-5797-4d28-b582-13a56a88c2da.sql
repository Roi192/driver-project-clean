CREATE POLICY "Battalion users can view soldiers"
ON public.soldiers
FOR SELECT
TO authenticated
USING (public.is_battalion_user(auth.uid()));

CREATE POLICY "Battalion users can view interviews"
ON public.driver_interviews
FOR SELECT
TO authenticated
USING (public.is_battalion_user(auth.uid()));

CREATE POLICY "Battalion users can create interviews"
ON public.driver_interviews
FOR INSERT
TO authenticated
WITH CHECK (public.is_battalion_user(auth.uid()));

CREATE POLICY "Battalion users can update interviews"
ON public.driver_interviews
FOR UPDATE
TO authenticated
USING (public.is_battalion_user(auth.uid()))
WITH CHECK (public.is_battalion_user(auth.uid()));

CREATE POLICY "Battalion users can view safety scores"
ON public.monthly_safety_scores
FOR SELECT
TO authenticated
USING (public.is_battalion_user(auth.uid()));