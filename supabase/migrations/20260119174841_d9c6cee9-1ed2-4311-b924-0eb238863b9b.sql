-- Courses management tables
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Soldiers enrolled in courses
CREATE TABLE public.soldier_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, cancelled
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cleaning parade responsibility areas per outpost
CREATE TABLE public.cleaning_responsibility_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outpost TEXT NOT NULL,
  area_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Cleaning parade schedule with soldier assignments
CREATE TABLE public.cleaning_parade_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parade_id UUID REFERENCES public.cleaning_parades(id) ON DELETE CASCADE,
  soldier_id UUID NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.cleaning_responsibility_areas(id) ON DELETE CASCADE,
  parade_date DATE NOT NULL,
  day_of_week TEXT NOT NULL, -- sunday, wednesday, saturday_evening
  outpost TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soldier_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_responsibility_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleaning_parade_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses
CREATE POLICY "Admins can manage courses" ON public.courses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  
CREATE POLICY "Authenticated users can view courses" ON public.courses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for soldier_courses
CREATE POLICY "Admins can manage soldier courses" ON public.soldier_courses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  
CREATE POLICY "Authenticated users can view soldier courses" ON public.soldier_courses
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for cleaning_responsibility_areas
CREATE POLICY "Admins can manage cleaning areas" ON public.cleaning_responsibility_areas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  
CREATE POLICY "Authenticated users can view cleaning areas" ON public.cleaning_responsibility_areas
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for cleaning_parade_assignments
CREATE POLICY "Admins can manage parade assignments" ON public.cleaning_parade_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  
CREATE POLICY "Users can view their own assignments" ON public.cleaning_parade_assignments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own assignments" ON public.cleaning_parade_assignments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_soldier_courses_updated_at
  BEFORE UPDATE ON public.soldier_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cleaning_responsibility_areas_updated_at
  BEFORE UPDATE ON public.cleaning_responsibility_areas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cleaning_parade_assignments_updated_at
  BEFORE UPDATE ON public.cleaning_parade_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default courses
INSERT INTO public.courses (name, description, category, duration_days) VALUES
  ('נהיגה מתקדמת', 'קורס נהיגה מתקדמת לנהגי רכב ביטחון', 'driving', 5),
  ('נהיגה מונעת', 'קורס נהיגה מונעת לשיפור בטיחות', 'driving', 3),
  ('רענון', 'קורס רענון לנהגים', 'driving', 2),
  ('מכונאות בסיסית', 'קורס מכונאות בסיסית לנהגים', 'technical', 4),
  ('עזרה ראשונה', 'קורס עזרה ראשונה בשטח', 'safety', 2);