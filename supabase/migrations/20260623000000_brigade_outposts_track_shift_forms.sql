-- Add track_shift_forms flag to brigade_outposts
-- Allows admins to control which outposts appear in shift-form tracking dashboard
ALTER TABLE brigade_outposts
  ADD COLUMN IF NOT EXISTS track_shift_forms boolean NOT NULL DEFAULT true;
