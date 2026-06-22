-- Add framework and driver-type fields to the safety and accident tables.
-- safety_content is the primary table for the Safety Events form.
-- safety_events is used for map display (synced from safety_content when coordinates exist).
-- All ADD COLUMN IF NOT EXISTS — safe, no data loss.

ALTER TABLE safety_content
  ADD COLUMN IF NOT EXISTS framework_type text,
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS battalion_name text,
  ADD COLUMN IF NOT EXISTS sector         text;

-- safety_events receives a subset of fields when syncing from safety_content (map display)
ALTER TABLE safety_events
  ADD COLUMN IF NOT EXISTS driver_type    text,
  ADD COLUMN IF NOT EXISTS framework_type text,
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS battalion_name text,
  ADD COLUMN IF NOT EXISTS sector         text,
  ADD COLUMN IF NOT EXISTS soldier_id     uuid REFERENCES soldiers(id) ON DELETE SET NULL;

ALTER TABLE accidents
  ADD COLUMN IF NOT EXISTS framework_type text,
  ADD COLUMN IF NOT EXISTS department     text,
  ADD COLUMN IF NOT EXISTS battalion_name text,
  ADD COLUMN IF NOT EXISTS sector         text;
