-- Grant brigade_admin INSERT / UPDATE / DELETE on safety_content, scoped to their brigade.
-- The RESTRICTIVE "profiles_brigade_restrict" policy already enforces the brigade ceiling.

-- ─── safety_content INSERT ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers can create safety content" ON public.safety_content;
CREATE POLICY "Managers can create safety content"
ON public.safety_content FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)           OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  has_role(auth.uid(), 'maphatch_admin'::app_role)  OR
  has_role(auth.uid(), 'brigade_admin'::app_role)
);

-- ─── safety_content UPDATE ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Managers can update safety content" ON public.safety_content;
CREATE POLICY "Managers can update safety content"
ON public.safety_content FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role)           OR
  has_role(auth.uid(), 'platoon_commander'::app_role) OR
  has_role(auth.uid(), 'battalion_admin'::app_role) OR
  has_role(auth.uid(), 'maphatch_admin'::app_role)  OR
  has_role(auth.uid(), 'brigade_admin'::app_role)
);

-- ─── safety_content DELETE ────────────────────────────────────────────────────
-- Original policy: only 'admin'. Extend to also allow brigade_admin.
DROP POLICY IF EXISTS "Only admin can delete safety content" ON public.safety_content;
CREATE POLICY "Only admin can delete safety content"
ON public.safety_content FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'brigade_admin'::app_role)
);

-- ─── storage: content-images — add brigade_admin ─────────────────────────────
DROP POLICY IF EXISTS "Commanders and admins can upload content images" ON storage.objects;
CREATE POLICY "Commanders and admins can upload content images"
ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)   OR
    has_role(auth.uid(), 'platoon_commander'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)       OR
    has_role(auth.uid(), 'maphatch_admin'::app_role)    OR
    has_role(auth.uid(), 'brigade_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can update content images" ON storage.objects;
CREATE POLICY "Commanders and admins can update content images"
ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)   OR
    has_role(auth.uid(), 'platoon_commander'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)       OR
    has_role(auth.uid(), 'maphatch_admin'::app_role)    OR
    has_role(auth.uid(), 'brigade_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)   OR
    has_role(auth.uid(), 'platoon_commander'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)       OR
    has_role(auth.uid(), 'maphatch_admin'::app_role)    OR
    has_role(auth.uid(), 'brigade_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can delete content images" ON storage.objects;
CREATE POLICY "Commanders and admins can delete content images"
ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)   OR
    has_role(auth.uid(), 'platoon_commander'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)       OR
    has_role(auth.uid(), 'maphatch_admin'::app_role)    OR
    has_role(auth.uid(), 'brigade_admin'::app_role)
  )
);
