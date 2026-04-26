-- Drop existing table if exists and recreate properly
DROP TABLE IF EXISTS public.cleaning_parades CASCADE;

-- Create the cleaning_parades table
CREATE TABLE public.cleaning_parades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    outpost TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    responsible_driver TEXT NOT NULL,
    photos TEXT[] DEFAULT '{}'::text[],
    parade_date DATE NOT NULL DEFAULT CURRENT_DATE,
    parade_time TIME NOT NULL DEFAULT CURRENT_TIME,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cleaning_parades ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.cleaning_parades TO authenticated;
GRANT SELECT ON TABLE public.cleaning_parades TO anon;

-- RLS Policies for drivers (regular users)
CREATE POLICY "Users can create their own cleaning parades"
ON public.cleaning_parades
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own cleaning parades"
ON public.cleaning_parades
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for admins
CREATE POLICY "Admins can view all cleaning parades"
ON public.cleaning_parades
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete cleaning parades"
ON public.cleaning_parades
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_cleaning_parades_updated_at
BEFORE UPDATE ON public.cleaning_parades
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();