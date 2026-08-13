-- Grant battalion_admin, platoon_commander, and super_admin access to
-- content-images bucket so they can upload safety event images.

DROP POLICY IF EXISTS "Commanders and admins can upload content images" ON storage.objects;
CREATE POLICY "Commanders and admins can upload content images"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can update content images" ON storage.objects;
CREATE POLICY "Commanders and admins can update content images"
ON storage.objects
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);

DROP POLICY IF EXISTS "Commanders and admins can delete content images" ON storage.objects;
CREATE POLICY "Commanders and admins can delete content images"
ON storage.objects
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND (
    has_role(auth.uid(), 'battalion_admin'::app_role)
    OR has_role(auth.uid(), 'platoon_commander'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);
