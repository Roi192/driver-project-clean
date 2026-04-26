-- First, let's add the new role values to the app_role enum
-- We need to add: platoon_commander (מ"מ נהגים), battalion_admin (גדוד תע"ם)

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'platoon_commander';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'battalion_admin';