ALTER TABLE public.soldiers
  ADD COLUMN IF NOT EXISTS manual_ineligibility_until DATE;
