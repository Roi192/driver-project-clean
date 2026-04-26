-- Fix RLS: allow platoon_commander to manage event attendance
DROP POLICY IF EXISTS "Admins can manage event attendance" ON public.event_attendance;

CREATE POLICY "Admins and platoon commanders can manage event attendance"
ON public.event_attendance
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'platoon_commander'::app_role)
);

-- Add content_cycle column to work_plan_events for bi-weekly content tracking
ALTER TABLE public.work_plan_events ADD COLUMN IF NOT EXISTS content_cycle text;

-- Add comment for clarity
COMMENT ON COLUMN public.work_plan_events.content_cycle IS 'Groups events that deliver the same content across rotation groups in a 2-week cycle';