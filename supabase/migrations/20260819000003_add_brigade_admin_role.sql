-- Add brigade_admin to the app_role enum.
-- Must be a standalone migration: PostgreSQL disallows using a new enum value
-- in the same transaction that creates it.
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'brigade_admin';
