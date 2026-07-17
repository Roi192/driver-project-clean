-- Add manual ineligibility columns
ALTER TABLE soldiers
  ADD COLUMN IF NOT EXISTS is_manually_ineligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_ineligibility_reason text,
  ADD COLUMN IF NOT EXISTS manual_ineligibility_since date;

-- Allow battalion_admin to update soldiers (needed for status changes)
DROP POLICY IF EXISTS "Admin and platoon commander can update soldiers" ON public.soldiers;

CREATE POLICY "Admin roles can update soldiers"
ON public.soldiers
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role)
);
