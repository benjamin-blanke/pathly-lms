-- Platform superadmins — a small, fixed allowlist with cross-organization
-- visibility. This is intentionally NOT self-service: there is no insert
-- policy for the `authenticated` role, so the only way onto this table is
-- a migration (below) or direct SQL run by someone with database access.
-- Being open source doesn't mean every install shares one allowlist —
-- self-hosters should edit or clear the seed below for their own deploy.

create table public.superadmins (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.superadmins where id = auth.uid());
$$;

alter table public.superadmins enable row level security;

-- Superadmins can see who else is one; nobody can grant it through the app.
create policy "superadmins_select_superadmin" on public.superadmins
  for select to authenticated using (public.is_superadmin());

-- Cross-organization visibility for superadmins (additive: these are extra
-- permissive SELECT/DELETE policies alongside each table's normal org-scoped
-- ones — Postgres RLS ORs permissive policies together).
create policy "profiles_select_superadmin" on public.profiles
  for select to authenticated using (public.is_superadmin());

create policy "courses_select_superadmin" on public.courses
  for select to authenticated using (public.is_superadmin());

create policy "organizations_delete_superadmin" on public.organizations
  for delete to authenticated using (public.is_superadmin());

-- Seed the allowlist. This only takes effect once each person has actually
-- signed up (auth.users rows don't exist before that) — if it inserts 0
-- rows here because they haven't signed up yet, re-run it later from the
-- Supabase SQL editor:
--
--   insert into public.superadmins (id, email)
--   select id, email from auth.users
--   where email in ('matteo@opus-host.de', 'benjamin@opus-host.de')
--   on conflict (id) do nothing;
insert into public.superadmins (id, email)
select id, email from auth.users
where email in ('matteo@opus-host.de', 'benjamin@opus-host.de')
on conflict (id) do nothing;
