
ALTER TABLE public.soldiers ADD COLUMN last_shooting_range_date date DEFAULT NULL;

COMMENT ON COLUMN public.soldiers.last_shooting_range_date IS 'תאריך מטווח אחרון';