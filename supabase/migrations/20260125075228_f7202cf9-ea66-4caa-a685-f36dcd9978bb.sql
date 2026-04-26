-- Create item assignments table for flexible item-to-shift-day mapping
CREATE TABLE IF NOT EXISTS public.cleaning_item_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outpost TEXT NOT NULL,
  item_id UUID NOT NULL REFERENCES public.cleaning_checklist_items(id) ON DELETE CASCADE,
  parade_day INTEGER NOT NULL CHECK (parade_day >= 0 AND parade_day <= 6),
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outpost, item_id, parade_day, shift_type)
);

-- Enable RLS
ALTER TABLE public.cleaning_item_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view item assignments"
ON public.cleaning_item_assignments FOR SELECT
USING (true);

CREATE POLICY "Admins can manage item assignments"
ON public.cleaning_item_assignments FOR ALL
USING (public.has_role(auth.uid(), 'admin'));