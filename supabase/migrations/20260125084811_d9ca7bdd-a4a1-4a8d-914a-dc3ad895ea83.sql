
-- Allow soldiers to view work_schedule for their assigned outpost
-- This is needed so drivers can see their cleaning parade assignments
CREATE POLICY "Soldiers can view work_schedule" 
ON public.work_schedule 
FOR SELECT 
TO authenticated
USING (
  -- Allow if the user is assigned to this schedule (morning, afternoon, or evening)
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN soldiers s ON p.personal_number = s.personal_number
    WHERE p.user_id = auth.uid()
    AND (
      s.id = work_schedule.morning_soldier_id OR
      s.id = work_schedule.afternoon_soldier_id OR
      s.id = work_schedule.evening_soldier_id
    )
  )
);