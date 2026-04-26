-- Ensure RLS is enabled for cleaning parade submissions
ALTER TABLE public.cleaning_parades ENABLE ROW LEVEL SECURITY;

-- Allow drivers to submit their own cleaning parade
DROP POLICY IF EXISTS "Drivers can insert their own cleaning parades" ON public.cleaning_parades;
CREATE POLICY "Drivers can insert their own cleaning parades"
ON public.cleaning_parades
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow drivers to read their own submissions
DROP POLICY IF EXISTS "Drivers can read their own cleaning parades" ON public.cleaning_parades;
CREATE POLICY "Drivers can read their own cleaning parades"
ON public.cleaning_parades
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to read all submissions
DROP POLICY IF EXISTS "Admins can read all cleaning parades" ON public.cleaning_parades;
CREATE POLICY "Admins can read all cleaning parades"
ON public.cleaning_parades
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));