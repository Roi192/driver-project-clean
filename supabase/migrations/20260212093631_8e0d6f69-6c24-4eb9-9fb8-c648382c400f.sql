
-- Remove the foreign key constraint since HAGMAR users are not in the soldiers table
ALTER TABLE public.weekend_weapon_holders DROP CONSTRAINT weekend_weapon_holders_soldier_id_fkey;