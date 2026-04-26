-- Fix RLS security warnings - replace permissive WITH CHECK (true) policies

-- Drop problematic INSERT policies
DROP POLICY IF EXISTS "Soldiers can create their own submissions" ON public.cleaning_parade_submissions;
DROP POLICY IF EXISTS "Soldiers can create checklist completions" ON public.cleaning_checklist_completions;

-- Create proper INSERT policies that verify the soldier belongs to the user
CREATE POLICY "Soldiers can create their own submissions"
ON public.cleaning_parade_submissions FOR INSERT
TO authenticated
WITH CHECK (
  soldier_id IN (
    SELECT s.id FROM soldiers s
    JOIN profiles p ON s.personal_number = p.personal_number
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Soldiers can create checklist completions"
ON public.cleaning_checklist_completions FOR INSERT
TO authenticated
WITH CHECK (
  submission_id IN (
    SELECT ps.id FROM cleaning_parade_submissions ps
    WHERE ps.soldier_id IN (
      SELECT s.id FROM soldiers s
      JOIN profiles p ON s.personal_number = p.personal_number
      WHERE p.user_id = auth.uid()
    )
  )
);