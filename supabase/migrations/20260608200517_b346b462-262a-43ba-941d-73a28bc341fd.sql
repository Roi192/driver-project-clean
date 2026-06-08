DROP POLICY IF EXISTS "Division admins can upload content images" ON storage.objects;
CREATE POLICY "Division admins can upload content images"
ON storage.objects
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images'
  AND public.is_division_admin(auth.uid())
);

DROP POLICY IF EXISTS "Division admins can update content images" ON storage.objects;
CREATE POLICY "Division admins can update content images"
ON storage.objects
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-images'
  AND public.is_division_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'content-images'
  AND public.is_division_admin(auth.uid())
);