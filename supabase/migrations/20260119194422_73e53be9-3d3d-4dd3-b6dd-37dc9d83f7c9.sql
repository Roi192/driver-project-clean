-- Add day_of_week column to cleaning_weekly_assignments
ALTER TABLE public.cleaning_weekly_assignments 
ADD COLUMN IF NOT EXISTS day_of_week text NOT NULL DEFAULT 'monday';

-- Drop old unique constraint if exists
ALTER TABLE public.cleaning_weekly_assignments 
DROP CONSTRAINT IF EXISTS cleaning_weekly_assignments_area_soldier_week_key;

-- Add new unique constraint including day
ALTER TABLE public.cleaning_weekly_assignments 
ADD CONSTRAINT cleaning_weekly_assignments_area_day_week_key 
UNIQUE (area_id, day_of_week, week_start_date);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_soldier_week_day 
ON public.cleaning_weekly_assignments(soldier_id, week_start_date, day_of_week);

-- Add index for area lookups
CREATE INDEX IF NOT EXISTS idx_weekly_assignments_area_week_day 
ON public.cleaning_weekly_assignments(area_id, week_start_date, day_of_week);