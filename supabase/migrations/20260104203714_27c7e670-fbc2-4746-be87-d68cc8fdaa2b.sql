-- Create a table for cleaning parade highlights/tips
CREATE TABLE public.cleaning_parade_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cleaning_parade_highlights ENABLE ROW LEVEL SECURITY;

-- Everyone can view active highlights
CREATE POLICY "Anyone can view active highlights" 
ON public.cleaning_parade_highlights 
FOR SELECT 
USING (is_active = true);

-- Only admins can manage highlights (full access)
CREATE POLICY "Admins can manage highlights" 
ON public.cleaning_parade_highlights 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Insert some default highlights
INSERT INTO public.cleaning_parade_highlights (title, display_order) VALUES
('שטיפת החדר', 1),
('סידור ארוניות ללא דברים מעל הארוניות', 2),
('ניקוי שירותים ומקלחות', 3),
('סידור מיטות', 4),
('פינוי אשפה', 5);

-- Create trigger for updating timestamps
CREATE TRIGGER update_cleaning_parade_highlights_updated_at
BEFORE UPDATE ON public.cleaning_parade_highlights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();