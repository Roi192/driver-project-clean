ALTER TABLE public.shift_reports
ADD COLUMN IF NOT EXISTS vehicle_notes text;