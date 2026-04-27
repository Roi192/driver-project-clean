-- Harden the trigger helper added for safety-event-to-accident synchronization
CREATE OR REPLACE FUNCTION public.sync_sector_event_to_accident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  event_date_value DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.accidents
    WHERE source_safety_content_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.category = 'sector_events'
     AND NEW.driver_type = 'security'
     AND NEW.soldier_id IS NOT NULL THEN
    event_date_value := COALESCE(NEW.event_date, CURRENT_DATE);

    INSERT INTO public.accidents (
      source_safety_content_id,
      soldier_id,
      accident_date,
      driver_type,
      driver_name,
      vehicle_number,
      incident_type,
      severity,
      location,
      description,
      status
    )
    VALUES (
      NEW.id,
      NEW.soldier_id,
      event_date_value,
      'security',
      NULLIF(NEW.driver_name, ''),
      NULLIF(NEW.vehicle_number, ''),
      COALESCE(NULLIF(NEW.event_type, ''), 'accident'),
      COALESCE(NULLIF(NEW.severity, ''), 'minor'),
      COALESCE(NULLIF(NEW.outpost, ''), NULLIF(NEW.region, '')),
      COALESCE(NULLIF(NEW.description, ''), NEW.title),
      'reported'
    )
    ON CONFLICT (source_safety_content_id) WHERE source_safety_content_id IS NOT NULL
    DO UPDATE SET
      soldier_id = EXCLUDED.soldier_id,
      accident_date = EXCLUDED.accident_date,
      driver_type = EXCLUDED.driver_type,
      driver_name = EXCLUDED.driver_name,
      vehicle_number = EXCLUDED.vehicle_number,
      incident_type = EXCLUDED.incident_type,
      severity = EXCLUDED.severity,
      location = EXCLUDED.location,
      description = EXCLUDED.description,
      updated_at = now();
  ELSE
    DELETE FROM public.accidents
    WHERE source_safety_content_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_sector_event_to_accident() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_sector_event_to_accident() FROM anon;
REVOKE ALL ON FUNCTION public.sync_sector_event_to_accident() FROM authenticated;