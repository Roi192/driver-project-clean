DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname = 'brigade_scope_restrict'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS brigade_scope_restrict ON %I.%I', r.schemaname, r.tablename);
    EXECUTE format(
      'CREATE POLICY brigade_scope_restrict ON %I.%I
       AS RESTRICTIVE
       FOR ALL
       TO authenticated
       USING (
         public.is_division_admin(auth.uid())
         OR brigade IS NULL
         OR brigade = public.get_user_brigade(auth.uid())
       )
       WITH CHECK (
         public.is_division_admin(auth.uid())
         OR brigade IS NULL
         OR brigade = public.get_user_brigade(auth.uid())
       )',
      r.schemaname,
      r.tablename
    );
  END LOOP;
END $$;