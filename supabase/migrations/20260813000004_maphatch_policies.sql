-- Policies for maphatch_admin role.
-- Must be a separate migration from the ALTER TYPE ADD VALUE (20260813000003)
-- because PostgreSQL disallows using a new enum value in the same transaction.

-- Grant maphatch_admin INSERT/UPDATE on safety_content
DROP POLICY IF EXISTS "Managers can create safety content" ON public.safety_content;
CREATE POLICY "Managers can create safety content"
ON public.safety_content FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  has_role(auth.uid(), 'maphatch_admin'::app_role)
);

DROP POLICY IF EXISTS "Managers can update safety content" ON public.safety_content;
CREATE POLICY "Managers can update safety content"
ON public.safety_content FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  has_role(auth.uid(), 'maphatch_admin'::app_role)
);

-- Grant maphatch_admin storage access (content-images)
DROP POLICY IF EXISTS "Commanders and admins can upload content images" ON storage.objects;
CREATE POLICY "Commanders and admins can upload content images"
ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can update content images" ON storage.objects;
CREATE POLICY "Commanders and admins can update content images"
ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can delete content images" ON storage.objects;
CREATE POLICY "Commanders and admins can delete content images"
ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'maphatch_admin'::app_role)
  )
);
