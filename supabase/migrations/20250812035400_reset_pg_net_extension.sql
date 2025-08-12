-- Drop the pg_net extension
DROP EXTENSION IF EXISTS "pg_net" CASCADE;

-- Re-create the pg_net extension
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";