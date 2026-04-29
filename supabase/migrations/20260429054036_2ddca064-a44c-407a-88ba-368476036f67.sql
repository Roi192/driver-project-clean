-- Preserve soldier name on event_attendance so historical attendance survives soldier deletion
ALTER TABLE public.event_attendance
  ADD COLUMN IF NOT EXISTS soldier_name_snapshot text;

-- Backfill from current soldiers table
UPDATE public.event_attendance ea
SET soldier_name_snapshot = s.full_name
FROM public.soldiers s
WHERE ea.soldier_id = s.id
  AND (ea.soldier_name_snapshot IS NULL OR ea.soldier_name_snapshot = '');

-- Trigger to auto-fill snapshot on insert/update if missing
CREATE OR REPLACE FUNCTION public.fill_event_attendance_soldier_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.soldier_name_snapshot IS NULL OR NEW.soldier_name_snapshot = '' THEN
    SELECT full_name INTO NEW.soldier_name_snapshot
    FROM public.soldiers
    WHERE id = NEW.soldier_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_event_attendance_snapshot ON public.event_attendance;
CREATE TRIGGER trg_fill_event_attendance_snapshot
BEFORE INSERT OR UPDATE ON public.event_attendance
FOR EACH ROW
EXECUTE FUNCTION public.fill_event_attendance_soldier_snapshot();