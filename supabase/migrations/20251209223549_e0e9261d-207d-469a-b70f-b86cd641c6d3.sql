-- Add columns to store which specific items were checked
ALTER TABLE public.shift_reports 
ADD COLUMN pre_movement_items_checked text[] DEFAULT '{}',
ADD COLUMN driver_tools_items_checked text[] DEFAULT '{}';