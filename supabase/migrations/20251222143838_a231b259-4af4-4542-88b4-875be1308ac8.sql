-- Create a restricted view for non-admin users with only essential fields
CREATE VIEW public.soldiers_basic AS
SELECT id, full_name, personal_number, outpost, is_active
FROM public.soldiers
WHERE is_active = true;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.soldiers_basic TO authenticated;

-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can view soldiers" ON soldiers;

-- Keep only admin access to the full soldiers table
-- (The "Admins can manage soldiers" policy already exists for ALL operations)