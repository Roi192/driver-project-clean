
-- Add department column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'planag';

-- Add settlement column for hagmar users
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS settlement TEXT;

-- Add id_number column for hagmar users (תעודת זהות)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS id_number TEXT;

-- Comment on columns
COMMENT ON COLUMN public.profiles.department IS 'Department: planag (פלנ"ג) or hagmar (הגמ"ר)';
COMMENT ON COLUMN public.profiles.settlement IS 'Settlement name for hagmar users';
COMMENT ON COLUMN public.profiles.id_number IS 'ID number (תעודת זהות) for hagmar users';