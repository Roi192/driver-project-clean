
-- Add tracking_date for daily tracking
ALTER TABLE public.equipment_tracking ADD COLUMN tracking_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Drop old unique constraint and add new one with date
ALTER TABLE public.equipment_tracking DROP CONSTRAINT IF EXISTS equipment_tracking_outpost_item_type_key;
ALTER TABLE public.equipment_tracking ADD CONSTRAINT equipment_tracking_outpost_item_type_date_key UNIQUE(outpost, item_type, tracking_date);