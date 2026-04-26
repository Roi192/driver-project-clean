-- Fix DELETE policy to support super_admin via has_role function
DROP POLICY IF EXISTS "Admins can delete training videos" ON public.training_videos;
CREATE POLICY "Admins can delete training videos" 
ON public.training_videos 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Also fix INSERT and UPDATE policies for consistency
DROP POLICY IF EXISTS "Admins can insert training videos" ON public.training_videos;
CREATE POLICY "Admins can insert training videos" 
ON public.training_videos 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update training videos" ON public.training_videos;
CREATE POLICY "Admins can update training videos" 
ON public.training_videos 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));