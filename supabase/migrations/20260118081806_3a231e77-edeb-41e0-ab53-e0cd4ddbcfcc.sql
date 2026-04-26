-- Add permits and license_type columns to soldiers table
ALTER TABLE public.soldiers 
ADD COLUMN IF NOT EXISTS license_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS permits text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.soldiers.license_type IS 'License type: B, C1, C';
COMMENT ON COLUMN public.soldiers.permits IS 'List of permits: דויד, סוואנה, טיגריס, פנתר';