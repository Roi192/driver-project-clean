-- Replace default_shift_type with source day+shift from schedule
ALTER TABLE public.cleaning_checklist_items 
ADD COLUMN IF NOT EXISTS source_schedule_day INTEGER,
ADD COLUMN IF NOT EXISTS source_schedule_shift TEXT;

-- Add comments
COMMENT ON COLUMN public.cleaning_checklist_items.source_schedule_day IS 'Day of week (0-6) from work schedule that determines responsibility';
COMMENT ON COLUMN public.cleaning_checklist_items.source_schedule_shift IS 'Shift type (morning/afternoon/evening) from work schedule that determines responsibility';