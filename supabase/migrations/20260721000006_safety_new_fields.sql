-- Add new fields to safety_content for the updated safety event form
ALTER TABLE public.safety_content
  ADD COLUMN IF NOT EXISTS event_time            TEXT,
  ADD COLUMN IF NOT EXISTS company_name          TEXT,
  ADD COLUMN IF NOT EXISTS involved_soldiers     TEXT,
  ADD COLUMN IF NOT EXISTS event_outcomes        TEXT,
  ADD COLUMN IF NOT EXISTS person_injury_severity TEXT,
  ADD COLUMN IF NOT EXISTS property_damage_severity TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_type          TEXT,
  ADD COLUMN IF NOT EXISTS unit_activity_type    TEXT,
  ADD COLUMN IF NOT EXISTS initial_lessons       TEXT;
