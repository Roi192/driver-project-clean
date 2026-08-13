-- Allow maphatch_admin to read profiles of users in their own department.
CREATE POLICY "Maphatch admins can view department profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'maphatch_admin'::app_role)
  AND user_type = 'maphatch'
  AND department = (
    SELECT department FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
  )
);
