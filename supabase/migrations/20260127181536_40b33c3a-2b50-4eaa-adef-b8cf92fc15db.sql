-- Weekly Opening/Closing meetings system

-- Weekly opening meetings (פתיחת שבוע)
CREATE TABLE public.weekly_openings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL,
    region TEXT NOT NULL,
    commander_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Manpower status per region (מצב כוח אדם)
CREATE TABLE public.weekly_manpower (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_opening_id UUID REFERENCES public.weekly_openings(id) ON DELETE CASCADE NOT NULL,
    soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present', -- present, absent, vacation, sick, course
    absence_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Driver fitness issues per region (כשירות נהגים)
CREATE TABLE public.weekly_fitness_issues (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_opening_id UUID REFERENCES public.weekly_openings(id) ON DELETE CASCADE NOT NULL,
    soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE NOT NULL,
    issue_type TEXT NOT NULL, -- license_expired, needs_test, needs_driving_course, suspended, needs_control_test
    issue_details TEXT,
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Safety activities planned for the week (פעולות בטיחות)
CREATE TABLE public.weekly_safety_activities (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_opening_id UUID REFERENCES public.weekly_openings(id) ON DELETE CASCADE NOT NULL,
    activity_type TEXT NOT NULL, -- training, briefing, drill, safety_bulletin, intervention, vulnerability_point
    title TEXT NOT NULL,
    description TEXT,
    soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL, -- relevant soldier if applicable
    needs_commander_help BOOLEAN DEFAULT false,
    commander_help_type TEXT, -- reset_talk, judgment, platoon_reset, battalion_reset
    planned_date DATE,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weekly schedule (לוז שבועי)
CREATE TABLE public.weekly_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_opening_id UUID REFERENCES public.weekly_openings(id) ON DELETE CASCADE NOT NULL,
    schedule_type TEXT NOT NULL, -- cleaning_parade, patrol_inspection, equipment_inspection, custom
    title TEXT NOT NULL,
    description TEXT,
    scheduled_day INTEGER NOT NULL, -- 0 = Sunday, 6 = Saturday
    scheduled_time TIME,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Commander summary (סיכום מ"פ)
CREATE TABLE public.weekly_commander_summary (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_opening_id UUID REFERENCES public.weekly_openings(id) ON DELETE CASCADE NOT NULL,
    summary_text TEXT,
    action_items TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Weekly closing (סיכום שבוע / סכמ"ש)
CREATE TABLE public.weekly_closings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    weekly_opening_id UUID REFERENCES public.weekly_openings(id) ON DELETE CASCADE NOT NULL,
    planning_vs_execution TEXT,
    unresolved_deviations TEXT,
    safety_events_summary TEXT,
    discipline_events_summary TEXT,
    commander_notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Commander's private weekly schedule (לוז מ"פ - פרטי)
CREATE TABLE public.commander_weekly_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL,
    commander_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    scheduled_day INTEGER NOT NULL,
    scheduled_time TIME,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.weekly_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_manpower ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_fitness_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_safety_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_commander_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commander_weekly_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weekly_openings (admin and platoon_commander can access)
CREATE POLICY "Admin can manage all weekly openings"
ON public.weekly_openings FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- RLS Policies for weekly_manpower
CREATE POLICY "Admin and platoon_commander can manage manpower"
ON public.weekly_manpower FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- RLS Policies for weekly_fitness_issues
CREATE POLICY "Admin and platoon_commander can manage fitness issues"
ON public.weekly_fitness_issues FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- RLS Policies for weekly_safety_activities
CREATE POLICY "Admin and platoon_commander can manage safety activities"
ON public.weekly_safety_activities FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- RLS Policies for weekly_schedule
CREATE POLICY "Admin and platoon_commander can manage schedule"
ON public.weekly_schedule FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- RLS Policies for weekly_commander_summary (only admin can access)
CREATE POLICY "Only admin can manage commander summary"
ON public.weekly_commander_summary FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for weekly_closings
CREATE POLICY "Admin and platoon_commander can manage closings"
ON public.weekly_closings FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'platoon_commander'));

-- RLS Policies for commander_weekly_schedule (only admin/owner can see their own)
CREATE POLICY "Admin can manage own commander schedule"
ON public.commander_weekly_schedule FOR ALL
USING (public.has_role(auth.uid(), 'admin') AND commander_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_weekly_openings_week ON public.weekly_openings(week_start_date);
CREATE INDEX idx_weekly_openings_region ON public.weekly_openings(region);
CREATE INDEX idx_weekly_schedule_opening ON public.weekly_schedule(weekly_opening_id);
CREATE INDEX idx_commander_schedule_week ON public.commander_weekly_schedule(week_start_date);