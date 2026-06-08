DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Division admins can view all profiles'
  ) THEN
    CREATE POLICY "Division admins can view all profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_division_admin(auth.uid()));
  END IF;
END $$;