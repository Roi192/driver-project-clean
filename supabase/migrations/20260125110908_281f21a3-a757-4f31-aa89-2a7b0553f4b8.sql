-- Add region field to safety_content table
ALTER TABLE public.safety_content 
ADD COLUMN IF NOT EXISTS region TEXT;

-- Add region field to safety_files table  
ALTER TABLE public.safety_files 
ADD COLUMN IF NOT EXISTS region TEXT;

-- Add region field to safety_events table
ALTER TABLE public.safety_events 
ADD COLUMN IF NOT EXISTS region TEXT;

-- Add deadline field to cleaning_item_assignments table
ALTER TABLE public.cleaning_item_assignments 
ADD COLUMN IF NOT EXISTS deadline_time TIME;

-- Update existing safety_files to have region based on outpost mapping
-- ארץ בנימין: בית אל, עפרה, מבו"ש, עטרת
UPDATE public.safety_files SET region = 'ארץ בנימין' 
WHERE outpost IN ('בית אל', 'עפרה', 'מבו"ש', 'עטרת') AND region IS NULL;

-- טלמונים: חורש ירון, נווה יאיר, רנתיס
UPDATE public.safety_files SET region = 'טלמונים' 
WHERE outpost IN ('חורש ירון', 'נווה יאיר', 'רנתיס') AND region IS NULL;

-- גבעת בנימין: כוכב יעקב, רמה, ענתות
UPDATE public.safety_files SET region = 'גבעת בנימין' 
WHERE outpost IN ('כוכב יעקב', 'רמה', 'ענתות') AND region IS NULL;

-- מכבים: מכבים, חשמונאים
UPDATE public.safety_files SET region = 'מכבים' 
WHERE outpost IN ('מכבים', 'חשמונאים') AND region IS NULL;

-- Create an index on region for faster filtering
CREATE INDEX IF NOT EXISTS idx_safety_files_region ON public.safety_files(region);
CREATE INDEX IF NOT EXISTS idx_safety_content_region ON public.safety_content(region);
CREATE INDEX IF NOT EXISTS idx_safety_events_region ON public.safety_events(region);