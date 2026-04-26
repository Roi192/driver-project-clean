-- Remove the old restrictive check constraint
ALTER TABLE public.cleaning_parade_submissions 
DROP CONSTRAINT IF EXISTS cleaning_parade_submissions_day_of_week_check;

-- Add a more flexible constraint that accepts both Hebrew and English day names or numeric format
ALTER TABLE public.cleaning_parade_submissions 
ADD CONSTRAINT cleaning_parade_submissions_day_of_week_check 
CHECK (day_of_week IS NOT NULL AND length(day_of_week) > 0);