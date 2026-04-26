-- Create table for example photos per outpost (managed by admin)
CREATE TABLE public.cleaning_parade_examples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outpost TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cleaning_parade_examples ENABLE ROW LEVEL SECURITY;

-- Admins can manage examples
CREATE POLICY "Admins can manage cleaning parade examples"
  ON public.cleaning_parade_examples
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view examples
CREATE POLICY "Authenticated users can view cleaning parade examples"
  ON public.cleaning_parade_examples
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create storage bucket for example photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cleaning-examples', 'cleaning-examples', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cleaning examples
CREATE POLICY "Anyone can view cleaning examples"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cleaning-examples');

CREATE POLICY "Admins can upload cleaning examples"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cleaning-examples' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cleaning examples"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cleaning-examples' AND has_role(auth.uid(), 'admin'::app_role));