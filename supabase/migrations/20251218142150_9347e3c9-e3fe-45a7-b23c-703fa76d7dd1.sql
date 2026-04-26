-- Add status column to event_attendance with 4 states
ALTER TABLE public.event_attendance 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'not_updated';

-- Add expected_soldiers column to work_plan_events to store list of soldiers expected for this event
ALTER TABLE public.work_plan_events
ADD COLUMN IF NOT EXISTS expected_soldiers uuid[] DEFAULT '{}';

-- Add event_series_id to work_plan_events for linking recurring events
ALTER TABLE public.work_plan_events
ADD COLUMN IF NOT EXISTS series_id text DEFAULT NULL;

-- Add is_series flag
ALTER TABLE public.work_plan_events
ADD COLUMN IF NOT EXISTS is_series boolean DEFAULT false;

-- Add series_pattern for recurring events (weekly, monthly, etc)
ALTER TABLE public.work_plan_events
ADD COLUMN IF NOT EXISTS series_pattern text DEFAULT NULL;

-- Update existing attendance records to have proper status
UPDATE public.event_attendance 
SET status = CASE 
  WHEN attended = true THEN 'attended'
  WHEN attended = false AND absence_reason IS NOT NULL THEN 'absent'
  ELSE 'not_updated'
END
WHERE status IS NULL OR status = 'not_updated';