
-- Create hagmar_soldiers table
CREATE TABLE public.hagmar_soldiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  phone TEXT,
  settlement TEXT NOT NULL,
  shoe_size TEXT,
  uniform_size_top TEXT,
  uniform_size_bottom TEXT,
  weapon_serial TEXT,
  last_shooting_range_date DATE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hagmar_certifications table
CREATE TABLE public.hagmar_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  soldier_id UUID NOT NULL REFERENCES public.hagmar_soldiers(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,
  certified_date DATE,
  last_refresh_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(soldier_id, cert_type)
);

-- Create hagmar_equipment table
CREATE TABLE public.hagmar_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  expected_quantity INTEGER NOT NULL DEFAULT 0,
  actual_quantity INTEGER NOT NULL DEFAULT 0,
  serial_numbers TEXT[],
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hagmar_training_events table
CREATE TABLE public.hagmar_training_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT,
  settlement TEXT,
  company TEXT,
  region TEXT,
  event_type TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hagmar_training_attendance table
CREATE TABLE public.hagmar_training_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.hagmar_training_events(id) ON DELETE CASCADE,
  soldier_id UUID NOT NULL REFERENCES public.hagmar_soldiers(id) ON DELETE CASCADE,
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, soldier_id)
);

-- Enable RLS
ALTER TABLE public.hagmar_soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hagmar_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hagmar_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hagmar_training_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hagmar_training_attendance ENABLE ROW LEVEL SECURITY;

-- hagmar_soldiers policies
CREATE POLICY "hagmar_soldiers_select" ON public.hagmar_soldiers FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (
    SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
  ))
);

CREATE POLICY "hagmar_soldiers_insert" ON public.hagmar_soldiers FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (
    SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
  ))
);

CREATE POLICY "hagmar_soldiers_update" ON public.hagmar_soldiers FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (
    SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
  ))
);

CREATE POLICY "hagmar_soldiers_delete" ON public.hagmar_soldiers FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- hagmar_certifications policies
CREATE POLICY "hagmar_certs_select" ON public.hagmar_certifications FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND soldier_id IN (
    SELECT s.id FROM public.hagmar_soldiers s WHERE s.settlement IN (
      SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  ))
);

CREATE POLICY "hagmar_certs_insert" ON public.hagmar_certifications FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND soldier_id IN (
    SELECT s.id FROM public.hagmar_soldiers s WHERE s.settlement IN (
      SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  ))
);

CREATE POLICY "hagmar_certs_update" ON public.hagmar_certifications FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND soldier_id IN (
    SELECT s.id FROM public.hagmar_soldiers s WHERE s.settlement IN (
      SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  ))
);

CREATE POLICY "hagmar_certs_delete" ON public.hagmar_certifications FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- hagmar_equipment policies
CREATE POLICY "hagmar_equipment_select" ON public.hagmar_equipment FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (
    SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
  ))
);

CREATE POLICY "hagmar_equipment_insert" ON public.hagmar_equipment FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (
    SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
  ))
);

CREATE POLICY "hagmar_equipment_update" ON public.hagmar_equipment FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  (public.has_role(auth.uid(), 'ravshatz'::app_role) AND settlement IN (
    SELECT p.settlement FROM public.profiles p WHERE p.user_id = auth.uid()
  ))
);

CREATE POLICY "hagmar_equipment_delete" ON public.hagmar_equipment FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- hagmar_training_events policies
CREATE POLICY "hagmar_events_select" ON public.hagmar_training_events FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  public.has_role(auth.uid(), 'ravshatz'::app_role)
);

CREATE POLICY "hagmar_events_insert" ON public.hagmar_training_events FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "hagmar_events_update" ON public.hagmar_training_events FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "hagmar_events_delete" ON public.hagmar_training_events FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- hagmar_training_attendance policies
CREATE POLICY "hagmar_attendance_select" ON public.hagmar_training_attendance FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  public.has_role(auth.uid(), 'ravshatz'::app_role)
);

CREATE POLICY "hagmar_attendance_insert" ON public.hagmar_training_attendance FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  public.has_role(auth.uid(), 'ravshatz'::app_role)
);

CREATE POLICY "hagmar_attendance_update" ON public.hagmar_training_attendance FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  public.has_role(auth.uid(), 'ravshatz'::app_role)
);

CREATE POLICY "hagmar_attendance_delete" ON public.hagmar_training_attendance FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'hagmar_admin'::app_role) OR
  public.has_role(auth.uid(), 'super_admin'::app_role)
);

-- Triggers
CREATE TRIGGER update_hagmar_soldiers_updated_at BEFORE UPDATE ON public.hagmar_soldiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hagmar_certifications_updated_at BEFORE UPDATE ON public.hagmar_certifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hagmar_equipment_updated_at BEFORE UPDATE ON public.hagmar_equipment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_hagmar_training_events_updated_at BEFORE UPDATE ON public.hagmar_training_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update has_role for super_admin -> hagmar_admin inheritance
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'super_admin' AND _role = 'admin')
        OR (role = 'super_admin' AND _role = 'hagmar_admin')
      )
  )
$$;