-- Add default_shift_type column to checklist items for default assignment
ALTER TABLE public.cleaning_checklist_items 
ADD COLUMN IF NOT EXISTS default_shift_type TEXT;

-- Add comment
COMMENT ON COLUMN public.cleaning_checklist_items.default_shift_type IS 'Default shift type for this item across all parade days';