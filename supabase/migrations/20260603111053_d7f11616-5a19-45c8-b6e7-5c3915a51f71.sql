CREATE OR REPLACE FUNCTION public.auto_fill_brigade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_brigade text;
  outpost_brigade text;
  row_data jsonb;
BEGIN
  user_brigade := public.get_user_brigade(auth.uid());
  row_data := to_jsonb(NEW);

  IF row_data ? 'outpost' AND COALESCE(row_data ->> 'outpost', '') <> '' THEN
    SELECT bo.brigade
    INTO outpost_brigade
    FROM public.brigade_outposts bo
    WHERE bo.name = row_data ->> 'outpost'
    ORDER BY CASE WHEN bo.brigade = user_brigade THEN 0 ELSE 1 END
    LIMIT 1;
  END IF;

  IF NEW.brigade IS NULL
     OR NEW.brigade = ''
     OR (
       NEW.brigade = 'binyamin'
       AND COALESCE(outpost_brigade, user_brigade) IS NOT NULL
       AND COALESCE(outpost_brigade, user_brigade) <> 'binyamin'
     ) THEN
    NEW.brigade := COALESCE(outpost_brigade, user_brigade, 'binyamin');
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.shift_reports sr
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE sr.outpost = bo.name
  AND sr.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.trip_forms tf
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE tf.outpost = bo.name
  AND tf.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.cleaning_parade_submissions cps
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE cps.outpost = bo.name
  AND cps.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.cleaning_checklist_items cci
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE cci.outpost = bo.name
  AND cci.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.cleaning_item_assignments cia
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE cia.outpost = bo.name
  AND cia.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.cleaning_manual_assignments cma
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE cma.outpost = bo.name
  AND cma.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.cleaning_reference_photos crp
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE crp.outpost = bo.name
  AND crp.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.work_schedule ws
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE ws.outpost = bo.name
  AND ws.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.soldiers s
SET brigade = bo.brigade
FROM public.brigade_outposts bo
WHERE s.outpost = bo.name
  AND s.brigade IS DISTINCT FROM bo.brigade;

UPDATE public.procedure_signatures ps
SET brigade = p.brigade
FROM public.profiles p
WHERE ps.user_id = p.user_id
  AND p.brigade IS NOT NULL
  AND p.brigade <> ''
  AND ps.brigade IS DISTINCT FROM p.brigade
  AND p.brigade <> 'binyamin';