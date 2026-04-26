-- Add concerns fields to weekly_openings table
ALTER TABLE public.weekly_openings 
  ADD COLUMN IF NOT EXISTS concerns TEXT,
  ADD COLUMN IF NOT EXISTS needs_commander_help BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS commander_help_description TEXT;