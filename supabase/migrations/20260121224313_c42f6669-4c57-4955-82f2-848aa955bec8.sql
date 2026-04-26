-- Add phone field to soldiers table
ALTER TABLE public.soldiers ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create work_schedule table for shift assignments
CREATE TABLE public.work_schedule (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    outpost TEXT NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
    week_start_date DATE NOT NULL, -- Start of the week (Sunday)
    morning_soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL,
    afternoon_soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL,
    evening_soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (outpost, day_of_week, week_start_date)
);

-- Create sms_notifications_log to track sent notifications
CREATE TABLE public.sms_notifications_log (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    soldier_id UUID REFERENCES public.soldiers(id) ON DELETE CASCADE,
    soldier_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    shift_type TEXT NOT NULL, -- 'morning', 'afternoon', 'evening'
    outpost TEXT NOT NULL,
    shift_date DATE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'delivered'
    error_message TEXT
);

-- Enable RLS
ALTER TABLE public.work_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_notifications_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_schedule
CREATE POLICY "Admins and commanders can view work_schedule"
ON public.work_schedule
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'platoon_commander') OR 
    public.has_role(auth.uid(), 'battalion_admin')
);

CREATE POLICY "Admins and platoon commanders can insert work_schedule"
ON public.work_schedule
FOR INSERT
TO authenticated
WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'platoon_commander')
);

CREATE POLICY "Admins and platoon commanders can update work_schedule"
ON public.work_schedule
FOR UPDATE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'platoon_commander')
);

CREATE POLICY "Admins and platoon commanders can delete work_schedule"
ON public.work_schedule
FOR DELETE
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'platoon_commander')
);

-- RLS policies for sms_notifications_log (view only for admins)
CREATE POLICY "Admins can view sms_notifications_log"
ON public.sms_notifications_log
FOR SELECT
TO authenticated
USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'platoon_commander')
);

-- Create trigger for updated_at
CREATE TRIGGER update_work_schedule_updated_at
BEFORE UPDATE ON public.work_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();