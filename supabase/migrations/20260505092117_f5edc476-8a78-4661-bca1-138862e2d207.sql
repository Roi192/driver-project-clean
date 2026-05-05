ALTER TABLE public.shift_reports
  ALTER COLUMN user_id DROP NOT NULL,
  DROP CONSTRAINT IF EXISTS shift_reports_user_id_fkey,
  ADD CONSTRAINT shift_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;