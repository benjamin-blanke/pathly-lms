-- Fix auth.uid()/auth.role()/auth.email() for modern PostgREST.
--
-- The supabase/postgres image bakes in versions of these functions that
-- only read the legacy per-claim GUCs (request.jwt.claim.sub, etc.).
-- PostgREST stopped setting those years ago — current versions only set
-- the JSON blob GUC (request.jwt.claims) — so on a fresh self-hosted
-- stack auth.uid() always returns NULL and every RLS policy that
-- depends on it (nearly all of them) silently blocks everything.
-- Supabase Cloud's actual production schema already has functions that
-- fall back to parsing the JSON blob; this migration brings that fix to
-- self-hosted deployments too. Safe/no-op if the legacy GUCs are ever
-- reintroduced, since they're still checked first.

create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    )::text
$$;

create or replace function auth.email()
returns text
language sql
stable
as $$
  select
    coalesce(
      nullif(current_setting('request.jwt.claim.email', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
    )::text
$$;
