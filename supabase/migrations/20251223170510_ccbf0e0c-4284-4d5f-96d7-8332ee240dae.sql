-- Add qualified_date column to soldiers table (when the driver became qualified)
ALTER TABLE public.soldiers 
ADD COLUMN qualified_date date DEFAULT CURRENT_DATE;

-- Update all existing soldiers to have qualified_date as today
UPDATE public.soldiers SET qualified_date = CURRENT_DATE WHERE qualified_date IS NULL;