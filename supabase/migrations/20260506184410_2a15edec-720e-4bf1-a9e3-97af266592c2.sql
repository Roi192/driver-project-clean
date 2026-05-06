CREATE TABLE IF NOT EXISTS public.deleted_soldiers_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_soldier_id UUID,
  full_name TEXT,
  personal_number TEXT,
  outpost TEXT,
  release_reason TEXT,
  release_date DATE,
  control_removed_at TIMESTAMP WITH TIME ZONE,
  soldier_created_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.deleted_soldiers_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view deleted soldiers archive"
ON public.deleted_soldiers_archive FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert deleted soldiers archive"
ON public.deleted_soldiers_archive FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete deleted soldiers archive"
ON public.deleted_soldiers_archive FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.archive_deleted_soldier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deleted_soldiers_archive (
    original_soldier_id, full_name, personal_number, outpost,
    release_reason, release_date, control_removed_at, soldier_created_at
  ) VALUES (
    OLD.id, OLD.full_name, OLD.personal_number, OLD.outpost,
    OLD.release_reason, OLD.release_date, OLD.control_removed_at, OLD.created_at
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_deleted_soldier ON public.soldiers;
CREATE TRIGGER trg_archive_deleted_soldier
BEFORE DELETE ON public.soldiers
FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_soldier();