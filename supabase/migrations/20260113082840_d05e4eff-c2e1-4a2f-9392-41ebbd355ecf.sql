-- Make public storage buckets private for security
-- This prevents unauthorized access to uploaded content

UPDATE storage.buckets 
SET public = false 
WHERE id IN ('content-images', 'cleaning-parades', 'cleaning-examples');

-- Ensure authenticated users can still access files via signed URLs
-- Add SELECT policy if not exists for authenticated users

DO $$
BEGIN
  -- content-images bucket policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can read content-images'
  ) THEN
    CREATE POLICY "Authenticated users can read content-images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);
  END IF;

  -- cleaning-parades bucket policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can read cleaning-parades'
  ) THEN
    CREATE POLICY "Authenticated users can read cleaning-parades"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cleaning-parades' AND auth.uid() IS NOT NULL);
  END IF;

  -- cleaning-examples bucket policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Authenticated users can read cleaning-examples'
  ) THEN
    CREATE POLICY "Authenticated users can read cleaning-examples"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cleaning-examples' AND auth.uid() IS NOT NULL);
  END IF;
END
$$;