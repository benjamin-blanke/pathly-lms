-- Lock deployments to a single organization.
--
-- Pathly is typically deployed one VPS per institution (install.sh sets up
-- one backend, one app). Letting any signed-up user spin up a brand new
-- org via "Create an organization" meant a student could accidentally (or
-- deliberately) found a second, unrelated tenant on someone else's
-- deployment instead of joining the school's real one. Once an
-- organization exists, only joining it (by its code) is allowed — the
-- first org created on a fresh deployment remains the only one, forever.

drop policy "organizations_insert_authenticated" on public.organizations;

create policy "organizations_insert_authenticated" on public.organizations
  for insert to authenticated
  with check (not exists (select 1 from public.organizations));
