-- Create table for dangerous road segments/routes
CREATE TABLE public.dangerous_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- Route points stored as JSON array of {lat, lng} objects
  route_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  severity TEXT NOT NULL DEFAULT 'high',
  danger_type TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dangerous_routes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view dangerous routes"
ON public.dangerous_routes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage dangerous routes"
ON public.dangerous_routes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));