-- Create soldiers control table
CREATE TABLE public.soldiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_number text NOT NULL UNIQUE,
  full_name text NOT NULL,
  military_license_expiry date,
  civilian_license_expiry date,
  release_date date,
  outpost text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create event attendance tracking
CREATE TABLE public.event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.work_plan_events(id) ON DELETE CASCADE NOT NULL,
  soldier_id uuid REFERENCES public.soldiers(id) ON DELETE CASCADE NOT NULL,
  attended boolean DEFAULT false,
  absence_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(event_id, soldier_id)
);

-- Create punishments tracking
CREATE TABLE public.punishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id uuid REFERENCES public.soldiers(id) ON DELETE CASCADE NOT NULL,
  punishment_date date NOT NULL,
  offense text NOT NULL,
  punishment text NOT NULL,
  judge text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create inspections table
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_date date NOT NULL,
  platoon text NOT NULL,
  commander_name text NOT NULL,
  soldier_id uuid REFERENCES public.soldiers(id) ON DELETE CASCADE NOT NULL,
  inspector_name text NOT NULL,
  
  -- Combat procedure section (10 points)
  combat_debrief_by text,
  combat_driver_participated boolean DEFAULT false,
  combat_driver_in_debrief boolean DEFAULT false,
  combat_score integer DEFAULT 0,
  
  -- Vehicle section (30 points)
  vehicle_tlt_oil boolean DEFAULT false,
  vehicle_tlt_water boolean DEFAULT false,
  vehicle_tlt_nuts boolean DEFAULT false,
  vehicle_tlt_pressure boolean DEFAULT false,
  vehicle_vardim_knowledge boolean DEFAULT false,
  vehicle_mission_sheet boolean DEFAULT false,
  vehicle_work_card boolean DEFAULT false,
  vehicle_clean boolean DEFAULT false,
  vehicle_equipment_secured boolean DEFAULT false,
  vehicle_score integer DEFAULT 0,
  
  -- Procedures section (20 points)
  procedures_descent_drill boolean DEFAULT false,
  procedures_rollover_drill boolean DEFAULT false,
  procedures_fire_drill boolean DEFAULT false,
  procedures_combat_equipment boolean DEFAULT false,
  procedures_weapon_present boolean DEFAULT false,
  procedures_score integer DEFAULT 0,
  
  -- Safety section (10 points)
  safety_ten_commandments boolean DEFAULT false,
  safety_driver_tools_extinguisher boolean DEFAULT false,
  safety_driver_tools_jack boolean DEFAULT false,
  safety_driver_tools_wheel_key boolean DEFAULT false,
  safety_driver_tools_vest boolean DEFAULT false,
  safety_driver_tools_triangle boolean DEFAULT false,
  safety_driver_tools_license boolean DEFAULT false,
  safety_score integer DEFAULT 0,
  
  -- Routes familiarity (15 points)
  routes_familiarity_score integer DEFAULT 0,
  routes_notes text,
  
  -- Simulations section (15 points)
  simulations_questions jsonb DEFAULT '[]',
  simulations_score integer DEFAULT 0,
  
  -- Total
  total_score integer DEFAULT 0,
  general_notes text,
  
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create holidays/memorials table
CREATE TABLE public.calendar_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_date date NOT NULL,
  category text NOT NULL CHECK (category IN ('holiday', 'memorial')),
  is_recurring boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add category to work_plan_events
ALTER TABLE public.work_plan_events 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'platoon' CHECK (category IN ('platoon', 'brigade', 'holiday'));

-- Enable RLS
ALTER TABLE public.soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.punishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_holidays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for soldiers - Admin only for write, all authenticated can read
CREATE POLICY "Admins can manage soldiers"
ON public.soldiers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view soldiers"
ON public.soldiers FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS Policies for event_attendance - Admin only
CREATE POLICY "Admins can manage event attendance"
ON public.event_attendance FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for punishments - Admin only
CREATE POLICY "Admins can manage punishments"
ON public.punishments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for inspections - Admin only
CREATE POLICY "Admins can manage inspections"
ON public.inspections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for calendar_holidays - Admin write, all read
CREATE POLICY "Admins can manage holidays"
ON public.calendar_holidays FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view holidays"
ON public.calendar_holidays FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Triggers
CREATE TRIGGER update_soldiers_updated_at
BEFORE UPDATE ON public.soldiers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_punishments_updated_at
BEFORE UPDATE ON public.punishments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
BEFORE UPDATE ON public.inspections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Israeli holidays and memorials
INSERT INTO public.calendar_holidays (title, event_date, category) VALUES
('ראש השנה', '2025-09-23', 'holiday'),
('יום כיפור', '2025-10-02', 'holiday'),
('סוכות', '2025-10-07', 'holiday'),
('שמחת תורה', '2025-10-14', 'holiday'),
('חנוכה', '2025-12-15', 'holiday'),
('פורים', '2026-03-17', 'holiday'),
('פסח', '2026-04-02', 'holiday'),
('יום העצמאות', '2026-04-22', 'holiday'),
('שבועות', '2026-05-22', 'holiday'),
('יום הזיכרון לחללי צהל', '2026-04-21', 'memorial'),
('יום השואה', '2026-04-08', 'memorial'),
('יום ירושלים', '2026-05-26', 'memorial');