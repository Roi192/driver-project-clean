-- Fix procedures table: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view procedures" ON public.procedures;
CREATE POLICY "Authenticated users can view procedures"
  ON public.procedures
  FOR SELECT
  TO authenticated
  USING (true);

-- Fix training_videos table: restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can view training videos" ON public.training_videos;
CREATE POLICY "Authenticated users can view training videos"
  ON public.training_videos
  FOR SELECT
  TO authenticated
  USING (true);