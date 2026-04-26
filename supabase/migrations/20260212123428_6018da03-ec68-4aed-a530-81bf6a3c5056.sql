
-- Add rotation group column to soldiers table
-- Values: 'a_sunday' (שבוע א ראשון-ראשון), 'a_monday' (שבוע א שני-שני), 
--         'b_sunday' (שבוע ב ראשון-ראשון), 'b_monday' (שבוע ב שני-שני)
ALTER TABLE public.soldiers 
ADD COLUMN rotation_group text DEFAULT NULL;

COMMENT ON COLUMN public.soldiers.rotation_group IS 'קבוצת סבב: a_sunday, a_monday, b_sunday, b_monday';