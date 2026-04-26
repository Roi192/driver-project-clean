-- Add image_url column to safety_files table
ALTER TABLE public.safety_files ADD COLUMN IF NOT EXISTS image_url text;