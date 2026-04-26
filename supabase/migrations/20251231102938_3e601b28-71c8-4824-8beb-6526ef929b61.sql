-- Add location columns to safety_files table
ALTER TABLE public.safety_files 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;