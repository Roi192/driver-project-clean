-- Allow deleting users without losing their content; set creator/updater to NULL on delete
ALTER TABLE public.dangerous_routes DROP CONSTRAINT IF EXISTS dangerous_routes_created_by_fkey,
  ADD CONSTRAINT dangerous_routes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.equipment_tracking DROP CONSTRAINT IF EXISTS equipment_tracking_created_by_fkey,
  ADD CONSTRAINT equipment_tracking_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hagmar_equipment DROP CONSTRAINT IF EXISTS hagmar_equipment_created_by_fkey,
  ADD CONSTRAINT hagmar_equipment_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hagmar_readiness_weights DROP CONSTRAINT IF EXISTS hagmar_readiness_weights_updated_by_fkey,
  ADD CONSTRAINT hagmar_readiness_weights_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hagmar_settlement_inspections DROP CONSTRAINT IF EXISTS hagmar_settlement_inspections_created_by_fkey,
  ADD CONSTRAINT hagmar_settlement_inspections_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hagmar_soldiers DROP CONSTRAINT IF EXISTS hagmar_soldiers_created_by_fkey,
  ADD CONSTRAINT hagmar_soldiers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hagmar_threat_ratings DROP CONSTRAINT IF EXISTS hagmar_threat_ratings_updated_by_fkey,
  ADD CONSTRAINT hagmar_threat_ratings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.hagmar_training_events DROP CONSTRAINT IF EXISTS hagmar_training_events_created_by_fkey,
  ADD CONSTRAINT hagmar_training_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.map_points_of_interest DROP CONSTRAINT IF EXISTS map_points_of_interest_created_by_fkey,
  ADD CONSTRAINT map_points_of_interest_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.monthly_excellence DROP CONSTRAINT IF EXISTS monthly_excellence_selected_by_fkey,
  ADD CONSTRAINT monthly_excellence_selected_by_fkey FOREIGN KEY (selected_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.monthly_safety_scores DROP CONSTRAINT IF EXISTS monthly_safety_scores_created_by_fkey,
  ADD CONSTRAINT monthly_safety_scores_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.mp_weekly_notes DROP CONSTRAINT IF EXISTS mp_weekly_notes_created_by_fkey,
  ADD CONSTRAINT mp_weekly_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.safety_followups DROP CONSTRAINT IF EXISTS safety_followups_created_by_fkey,
  ADD CONSTRAINT safety_followups_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.work_schedule DROP CONSTRAINT IF EXISTS work_schedule_created_by_fkey,
  ADD CONSTRAINT work_schedule_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;