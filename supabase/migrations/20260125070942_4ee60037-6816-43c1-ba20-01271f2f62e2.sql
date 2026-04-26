-- Add responsible_soldier_id column directly to checklist items for grouping
ALTER TABLE public.cleaning_checklist_items 
ADD COLUMN IF NOT EXISTS responsible_soldier_id UUID REFERENCES public.soldiers(id) ON DELETE SET NULL;

-- Add shift linking for auto-assignment from work schedule
ALTER TABLE public.cleaning_checklist_items 
ADD COLUMN IF NOT EXISTS shift_day TEXT,
ADD COLUMN IF NOT EXISTS shift_type TEXT,
ADD COLUMN IF NOT EXISTS deadline_time TIME;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_checklist_items_soldier ON public.cleaning_checklist_items(responsible_soldier_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_shift ON public.cleaning_checklist_items(shift_day, shift_type);