-- Add correct_driving_in_service_date field to soldiers table
ALTER TABLE public.soldiers
ADD COLUMN correct_driving_in_service_date date;

-- Add comment explaining the field
COMMENT ON COLUMN public.soldiers.correct_driving_in_service_date IS 'Date of last correct driving in service training - required annually';