-- Add completed field and update absence_reason to support new options
ALTER TABLE public.event_attendance 
ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.event_attendance.completed IS 'Whether the soldier completed a make-up session for the missed event';
COMMENT ON COLUMN public.event_attendance.absence_reason IS 'Reason for absence: קורס, גימלים, נעדר, or custom text';