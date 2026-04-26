-- Add INSERT policies for authenticated users to upload files to storage buckets

-- cleaning-parades bucket - allow users to upload to their own folder
CREATE POLICY "Authenticated users can upload to cleaning-parades"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cleaning-parades' AND auth.uid() IS NOT NULL);

-- cleaning-examples bucket - allow authenticated users to upload (admin use)
CREATE POLICY "Authenticated users can upload to cleaning-examples"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cleaning-examples' AND auth.uid() IS NOT NULL);

-- content-images bucket - allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to content-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);