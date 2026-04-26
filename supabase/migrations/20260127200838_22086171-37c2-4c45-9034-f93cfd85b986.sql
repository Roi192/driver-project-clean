-- Add end_time column to weekly_schedule table
ALTER TABLE public.weekly_schedule 
ADD COLUMN IF NOT EXISTS end_time TIME WITHOUT TIME ZONE;