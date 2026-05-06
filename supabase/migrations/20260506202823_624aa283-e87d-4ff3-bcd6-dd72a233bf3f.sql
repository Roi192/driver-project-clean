-- Yearly summary overrides: hide items from a list, or add manual entries
CREATE TABLE IF NOT EXISTS public.yearly_summary_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  kind TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('hide','manual')),
  original_id TEXT,
  payload JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_yso_year_kind ON public.yearly_summary_overrides (year, kind);

ALTER TABLE public.yearly_summary_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view overrides"
  ON public.yearly_summary_overrides FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can insert overrides"
  ON public.yearly_summary_overrides FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update overrides"
  ON public.yearly_summary_overrides FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete overrides"
  ON public.yearly_summary_overrides FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));