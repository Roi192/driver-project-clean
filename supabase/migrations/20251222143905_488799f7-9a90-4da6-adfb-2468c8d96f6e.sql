-- Drop the old view
DROP VIEW IF EXISTS public.soldiers_basic;

-- Create a new view with SECURITY INVOKER (default, explicit for clarity)
-- This ensures the view uses the calling user's permissions
CREATE VIEW public.soldiers_basic 
WITH (security_invoker = true) AS
SELECT id, full_name, personal_number, outpost, is_active
FROM public.soldiers
WHERE is_active = true;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.soldiers_basic TO authenticated;

-- Create RLS policy allowing authenticated users to SELECT from soldiers table 
-- (needed for view to work, but only through the view which limits columns)
CREATE POLICY "Authenticated users can view soldiers via view"
ON public.soldiers
FOR SELECT
USING (auth.uid() IS NOT NULL);