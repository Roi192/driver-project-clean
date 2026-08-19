-- Fix FK constraints on historical tables that previously had no ON DELETE clause
-- (defaulting to RESTRICT / NO ACTION), which silently blocked soldier row deletion
-- and would block soft-delete operations.
--
-- For every historical table that links to soldiers(id), we change to SET NULL so
-- the historical record survives even if the soldier row is later removed.
-- (Currently we soft-delete soldiers with is_active=false, so these FKs are mostly
-- a safety net, but they must be correct regardless.)

-- driver_interviews.soldier_id  (20260115135247 created without ON DELETE)
ALTER TABLE public.driver_interviews
  DROP CONSTRAINT IF EXISTS driver_interviews_soldier_id_fkey;
ALTER TABLE public.driver_interviews
  ADD CONSTRAINT driver_interviews_soldier_id_fkey
    FOREIGN KEY (soldier_id) REFERENCES public.soldiers(id) ON DELETE SET NULL;

-- safety_content.soldier_id  (20260129102425 created without ON DELETE)
ALTER TABLE public.safety_content
  DROP CONSTRAINT IF EXISTS safety_content_soldier_id_fkey;
ALTER TABLE public.safety_content
  ADD CONSTRAINT safety_content_soldier_id_fkey
    FOREIGN KEY (soldier_id) REFERENCES public.soldiers(id) ON DELETE SET NULL;

-- cleaning_item_assignments.manual_soldier_id  (20260125080948 created without ON DELETE)
ALTER TABLE public.cleaning_item_assignments
  DROP CONSTRAINT IF EXISTS cleaning_item_assignments_manual_soldier_id_fkey;
ALTER TABLE public.cleaning_item_assignments
  ADD CONSTRAINT cleaning_item_assignments_manual_soldier_id_fkey
    FOREIGN KEY (manual_soldier_id) REFERENCES public.soldiers(id) ON DELETE SET NULL;

-- push_subscriptions: add FK so subscriptions are cleaned up when the auth user is deleted
-- (no FK existed before — left orphaned rows after user deletion)
ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
