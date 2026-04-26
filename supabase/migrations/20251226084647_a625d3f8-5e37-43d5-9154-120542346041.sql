-- Create table for map points of interest (manually added by admins)
CREATE TABLE public.map_points_of_interest (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  point_type TEXT NOT NULL DEFAULT 'outpost', -- outpost, danger_zone, checkpoint, other
  severity TEXT DEFAULT 'medium', -- low, medium, high (for danger zones)
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.map_points_of_interest ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view map points"
ON public.map_points_of_interest
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage map points"
ON public.map_points_of_interest
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_map_points_of_interest_updated_at
BEFORE UPDATE ON public.map_points_of_interest
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default outpost locations (approximate coordinates in the West Bank area)
INSERT INTO public.map_points_of_interest (name, latitude, longitude, point_type, description) VALUES
('חשמונאים', 31.8450, 35.0150, 'outpost', 'מוצב חשמונאים'),
('כוכב יעקב', 31.8553, 35.2870, 'outpost', 'מוצב כוכב יעקב'),
('רמה', 31.9000, 35.2500, 'outpost', 'מוצב רמה'),
('ענתות', 31.8200, 35.2600, 'outpost', 'מוצב ענתות'),
('בית אל', 31.9400, 35.2200, 'outpost', 'מוצב בית אל'),
('עפרה', 31.9650, 35.2800, 'outpost', 'מוצב עפרה'),
('מבו"ש', 31.8900, 35.2700, 'outpost', 'מוצב מבו"ש'),
('עטרת', 31.9700, 35.2100, 'outpost', 'מוצב עטרת'),
('חורש ירון', 31.9200, 35.2300, 'outpost', 'מוצב חורש ירון'),
('נווה יאיר', 31.8700, 35.2400, 'outpost', 'מוצב נווה יאיר'),
('רנתיס', 31.9500, 35.0800, 'outpost', 'מוצב רנתיס'),
('מכבים', 31.8600, 35.0300, 'outpost', 'מוצב מכבים');