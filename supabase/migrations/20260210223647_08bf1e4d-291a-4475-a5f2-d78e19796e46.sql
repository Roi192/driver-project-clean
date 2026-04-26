
-- Equipment tracking table for צל"ם management
CREATE TABLE public.equipment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outpost TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'ringo', 'matulon', 'rimon_rss', 'matul_nafitz', 'til_lau'
  expected_quantity INTEGER NOT NULL DEFAULT 0,
  actual_quantity INTEGER NOT NULL DEFAULT 0,
  serial_numbers TEXT[] DEFAULT '{}', -- for ringo and matulon only
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(outpost, item_type)
);

-- Enable RLS
ALTER TABLE public.equipment_tracking ENABLE ROW LEVEL SECURITY;

-- Only authenticated users with admin role can manage equipment tracking
CREATE POLICY "Admins can view equipment tracking"
ON public.equipment_tracking
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert equipment tracking"
ON public.equipment_tracking
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update equipment tracking"
ON public.equipment_tracking
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete equipment tracking"
ON public.equipment_tracking
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Auto-update timestamp trigger
CREATE TRIGGER update_equipment_tracking_updated_at
BEFORE UPDATE ON public.equipment_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();