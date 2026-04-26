-- Add judgment fields to accidents table
ALTER TABLE public.accidents ADD COLUMN IF NOT EXISTS was_judged boolean DEFAULT false;
ALTER TABLE public.accidents ADD COLUMN IF NOT EXISTS judgment_result text;