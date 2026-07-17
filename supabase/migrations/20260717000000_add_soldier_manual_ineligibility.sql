ALTER TABLE soldiers
  ADD COLUMN IF NOT EXISTS is_manually_ineligible boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_ineligibility_reason text;
