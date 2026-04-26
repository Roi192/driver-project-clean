-- Create training_videos table
CREATE TABLE public.training_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  duration TEXT,
  thumbnail_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create procedures table
CREATE TABLE public.procedures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  file_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;

-- Training videos policies (everyone can view, only admins can modify)
CREATE POLICY "Anyone can view training videos"
  ON public.training_videos
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert training videos"
  ON public.training_videos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update training videos"
  ON public.training_videos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete training videos"
  ON public.training_videos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Procedures policies (everyone can view, only admins can modify)
CREATE POLICY "Anyone can view procedures"
  ON public.procedures
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert procedures"
  ON public.procedures
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update procedures"
  ON public.procedures
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete procedures"
  ON public.procedures
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Update triggers for updated_at
CREATE TRIGGER update_training_videos_updated_at
  BEFORE UPDATE ON public.training_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_procedures_updated_at
  BEFORE UPDATE ON public.procedures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();