-- Add personal_number column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS personal_number text;

-- Create index for personal_number searches
CREATE INDEX IF NOT EXISTS idx_profiles_personal_number ON public.profiles(personal_number);