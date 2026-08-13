-- Link accidents to the safety_content record that created them.
-- Used to cascade-delete the accident when its parent safety event is deleted.
ALTER TABLE public.accidents
  ADD COLUMN IF NOT EXISTS safety_content_id uuid;

CREATE INDEX IF NOT EXISTS accidents_safety_content_id_idx
  ON public.accidents (safety_content_id);
