-- 1. Trigger function: auto-fill brigade on insert from user's profile
CREATE OR REPLACE FUNCTION public.auto_fill_brigade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.brigade IS NULL OR NEW.brigade = '' THEN
    NEW.brigade := COALESCE(public.get_user_brigade(auth.uid()), 'binyamin');
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Apply brigade auto-fill trigger + RESTRICTIVE brigade-scope RLS policy
--    to every brigade-scoped operational table.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'soldiers','courses','soldier_courses',
    'inspections','punishments','soldier_warnings','warning_categories',
    'driver_interviews','shift_reports','trip_forms',
    'bom_tasks','company_tasks','task_assignments','task_completions',
    'equipment_tracking',
    'work_plan_events','work_schedule',
    'weekly_manpower','weekly_schedule','commander_weekly_schedule','mp_weekly_notes',
    'weekly_closings','weekly_openings','weekly_commander_summary',
    'weekly_fitness_issues','weekly_safety_activities',
    'weekend_weapon_holders',
    'monthly_safety_scores','monthly_excellence','yearly_summary_overrides',
    'dangerous_routes','map_points_of_interest','sector_boundaries',
    'content_cycle_overrides',
    'safety_followups','procedure_signatures','procedures','training_videos',
    'cleaning_parades','cleaning_parade_submissions','cleaning_parade_config',
    'cleaning_checklist_items','cleaning_checklist_completions',
    'cleaning_item_assignments','cleaning_manual_assignments',
    'cleaning_reference_photos','cleaning_responsibility_areas',
    'calendar_holidays','exit_requests',
    'event_attendance','deleted_soldiers_archive',
    'accidents','safety_events','safety_content',
    'brigade_outposts','drill_locations','safety_files'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Skip if table doesn't exist or lacks brigade column
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='brigade'
    ) THEN
      CONTINUE;
    END IF;

    -- Drop & recreate trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_auto_brigade ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_auto_brigade BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.auto_fill_brigade()',
      t
    );

    -- Drop & recreate restrictive brigade-scope policy
    EXECUTE format('DROP POLICY IF EXISTS brigade_scope_restrict ON public.%I', t);
    EXECUTE format($f$
      CREATE POLICY brigade_scope_restrict ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (
        public.is_division_admin(auth.uid())
        OR brigade IS NULL
        OR brigade = public.get_user_brigade(auth.uid())
      )
      WITH CHECK (
        public.is_division_admin(auth.uid())
        OR brigade IS NULL
        OR brigade = public.get_user_brigade(auth.uid())
      )
    $f$, t);
  END LOOP;
END $$;