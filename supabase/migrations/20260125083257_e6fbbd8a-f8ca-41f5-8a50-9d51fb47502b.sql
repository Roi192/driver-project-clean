-- Remove the restrictive check constraint on shift_type
-- We need to store values like "0-morning" (day-shift combo) or "manual-{soldierid}"
ALTER TABLE public.cleaning_item_assignments 
DROP CONSTRAINT IF EXISTS cleaning_item_assignments_shift_type_check;