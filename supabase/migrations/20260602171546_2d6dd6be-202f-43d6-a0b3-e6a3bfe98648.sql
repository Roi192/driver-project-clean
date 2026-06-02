-- Add brigade column to all planag operational BASE TABLES (skip views) for brigade-scoped isolation.
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
    'event_attendance','deleted_soldiers_archive'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name=t AND table_type='BASE TABLE'
       )
       AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=t AND column_name='brigade'
       )
    THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN brigade text NOT NULL DEFAULT %L', t, 'binyamin');
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (brigade)', 'idx_'||t||'_brigade', t);
    END IF;
  END LOOP;
END $$;

UPDATE public.soldiers SET brigade = 'binyamin' WHERE brigade IS NULL;
UPDATE public.accidents SET brigade = 'binyamin' WHERE brigade IS NULL;
UPDATE public.safety_events SET brigade = 'binyamin' WHERE brigade IS NULL;
UPDATE public.profiles SET brigade = COALESCE(brigade, 'binyamin');