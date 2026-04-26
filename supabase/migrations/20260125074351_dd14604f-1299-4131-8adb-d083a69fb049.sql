-- Add parade days configuration table
CREATE TABLE IF NOT EXISTS public.cleaning_parade_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outpost TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outpost, day_of_week)
);

-- Enable RLS
ALTER TABLE public.cleaning_parade_config ENABLE ROW LEVEL SECURITY;

-- Policies for parade config
CREATE POLICY "Anyone can view parade config"
ON public.cleaning_parade_config FOR SELECT
USING (true);

CREATE POLICY "Admins can manage parade config"
ON public.cleaning_parade_config FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update responsibility areas: make shift_day nullable and add description
-- (shift_day will be deprecated, shift_type will be the primary grouping)
COMMENT ON COLUMN public.cleaning_responsibility_areas.shift_day IS 'Deprecated - use shift_type only for template-based assignments';

-- Insert default parade days for existing outposts (Sunday=0, Wednesday=3, Saturday=6)
INSERT INTO public.cleaning_parade_config (outpost, day_of_week)
SELECT DISTINCT outpost, unnest(ARRAY[0, 3, 6]) as day_of_week
FROM public.cleaning_checklist_items
WHERE outpost IS NOT NULL
ON CONFLICT (outpost, day_of_week) DO NOTHING;