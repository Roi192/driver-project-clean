-- Fix exit_requests FK constraints so that deleting a user does not violate
-- referential integrity.  Both columns are nullable, so ON DELETE SET NULL is safe.

DO $$
BEGIN
  -- decided_by
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'exit_requests_decided_by_fkey'
      AND table_schema = 'public'
      AND table_name   = 'exit_requests'
  ) THEN
    ALTER TABLE public.exit_requests DROP CONSTRAINT exit_requests_decided_by_fkey;
  END IF;

  -- created_by
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'exit_requests_created_by_fkey'
      AND table_schema = 'public'
      AND table_name   = 'exit_requests'
  ) THEN
    ALTER TABLE public.exit_requests DROP CONSTRAINT exit_requests_created_by_fkey;
  END IF;
END $$;

ALTER TABLE public.exit_requests
  ADD CONSTRAINT exit_requests_decided_by_fkey
    FOREIGN KEY (decided_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT exit_requests_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
