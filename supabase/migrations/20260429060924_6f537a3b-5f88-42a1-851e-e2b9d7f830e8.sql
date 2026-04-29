ALTER TABLE public.soldiers
ADD COLUMN IF NOT EXISTS control_removed_at timestamp with time zone;

UPDATE public.soldiers
SET control_removed_at = COALESCE(control_removed_at, updated_at, now())
WHERE COALESCE(is_active, false) = false
  AND control_removed_at IS NULL;