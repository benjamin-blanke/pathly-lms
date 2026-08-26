-- Set passwords only for the roles Pathly's minimal stack actually uses
-- (no Storage, no Edge Functions, no connection pooler) — the full set
-- Supabase's own reference script alters includes roles that don't exist
-- on every image build (e.g. supabase_functions_admin), which aborts
-- the whole init chain under `psql -v ON_ERROR_STOP=1` before the
-- baked-in migrations that fix auth.uid()/auth.role() ownership ever run.
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
