CREATE OR REPLACE FUNCTION public.fill_event_attendance_soldier_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
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