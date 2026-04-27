-- Link accidents to the source safety event so sector-map events appear in the soldier profile reliably
ALTER TABLE public.accidents
ADD COLUMN IF NOT EXISTS source_safety_content_id UUID REFERENCES public.safety_content(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS accidents_source_safety_content_id_unique
ON public.accidents(source_safety_content_id)
WHERE source_safety_content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accidents_soldier_id_accident_date
ON public.accidents(soldier_id, accident_date DESC);

-- Keep every security-driver sector event with a selected soldier mirrored into accidents
CREATE OR REPLACE FUNCTION public.sync_sector_event_to_accident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

DROP TRIGGER IF EXISTS sync_sector_event_to_accident_trigger ON public.safety_content;
CREATE TRIGGER sync_sector_event_to_accident_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.safety_content
FOR EACH ROW
EXECUTE FUNCTION public.sync_sector_event_to_accident();

-- Backfill existing sector events for security drivers already linked to a soldier
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
SELECT
  sc.id,
  sc.soldier_id,
  COALESCE(sc.event_date, CURRENT_DATE),
  'security',
  NULLIF(sc.driver_name, ''),
  NULLIF(sc.vehicle_number, ''),
  COALESCE(NULLIF(sc.event_type, ''), 'accident'),
  COALESCE(NULLIF(sc.severity, ''), 'minor'),
  COALESCE(NULLIF(sc.outpost, ''), NULLIF(sc.region, '')),
  COALESCE(NULLIF(sc.description, ''), sc.title),
  'reported'
FROM public.safety_content sc
WHERE sc.category = 'sector_events'
  AND sc.driver_type = 'security'
  AND sc.soldier_id IS NOT NULL
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