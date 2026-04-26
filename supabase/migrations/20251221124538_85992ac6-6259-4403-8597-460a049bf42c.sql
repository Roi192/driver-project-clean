-- Add defensive_driving_passed column to soldiers table
ALTER TABLE public.soldiers 
ADD COLUMN defensive_driving_passed boolean DEFAULT false;