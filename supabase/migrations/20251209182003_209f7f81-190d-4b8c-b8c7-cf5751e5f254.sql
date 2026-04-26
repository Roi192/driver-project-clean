-- Create storage bucket for content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view content images
CREATE POLICY "Anyone can view content images"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-images');

-- Allow admins to upload content images
CREATE POLICY "Admins can upload content images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'content-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to update content images
CREATE POLICY "Admins can update content images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'content-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Allow admins to delete content images
CREATE POLICY "Admins can delete content images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'content-images' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);