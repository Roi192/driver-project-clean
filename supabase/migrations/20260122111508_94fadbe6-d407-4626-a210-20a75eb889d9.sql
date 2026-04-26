-- Fix RLS policy for cleaning_notifications_log - restrict inserts to managers only
DROP POLICY IF EXISTS "System can insert cleaning notifications" ON public.cleaning_notifications_log;

CREATE POLICY "Managers can insert cleaning notifications"
ON public.cleaning_notifications_log FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'platoon_commander'::app_role)
);