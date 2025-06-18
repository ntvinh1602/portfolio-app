-- 0007_add_display_name_to_profiles.sql
-- Add a display_name column to the profiles table to let users store a custom name.

ALTER TABLE public.profiles
ADD COLUMN display_name TEXT;

COMMENT ON COLUMN public.profiles.display_name IS 'The user''s preferred display name in the application.';