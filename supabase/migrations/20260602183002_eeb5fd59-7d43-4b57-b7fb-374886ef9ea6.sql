DROP POLICY IF EXISTS "Battalion users can create interviews" ON public.driver_interviews;
DROP POLICY IF EXISTS "Battalion users can update interviews" ON public.driver_interviews;

CREATE POLICY "Battalion users can create interviews"
ON public.driver_interviews
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_battalion_user(auth.uid())
  AND (brigade IS NULL OR brigade = public.get_user_brigade(auth.uid()))
);

CREATE POLICY "Battalion users can update interviews"
ON public.driver_interviews
FOR UPDATE
TO authenticated
USING (
  public.is_battalion_user(auth.uid())
  AND (brigade IS NULL OR brigade = public.get_user_brigade(auth.uid()))
)
WITH CHECK (
  public.is_battalion_user(auth.uid())
  AND (brigade IS NULL OR brigade = public.get_user_brigade(auth.uid()))
);