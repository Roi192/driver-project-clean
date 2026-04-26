-- Add status and checklist fields to accidents table
ALTER TABLE public.accidents 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'reported',
ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '{"debriefing": false, "driver_talk": false, "closed": false}'::jsonb,
ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;

-- Add check constraint for status values
ALTER TABLE public.accidents 
DROP CONSTRAINT IF EXISTS accidents_status_check;

ALTER TABLE public.accidents 
ADD CONSTRAINT accidents_status_check 
CHECK (status IN ('reported', 'investigating', 'closed'));