-- Add manual soldier override to item assignments
ALTER TABLE public.cleaning_item_assignments 
ADD COLUMN IF NOT EXISTS manual_soldier_id UUID REFERENCES public.soldiers(id);

-- Add comment
COMMENT ON COLUMN public.cleaning_item_assignments.manual_soldier_id IS 'Optional manual soldier override for this specific assignment';