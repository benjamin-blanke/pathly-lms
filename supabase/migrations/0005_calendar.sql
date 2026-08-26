-- Calendar — org-wide, per-course, and personal events, plus a per-user
-- secret token so external calendar apps can subscribe to a read-only iCal
-- feed (Apple/Google/Outlook "subscribe by URL"). This is calendar
-- *subscription*, not full read/write CalDAV (WebDAV PROPFIND/REPORT/
-- MKCALENDAR) — see the roadmap for that distinction.

create type public.calendar_scope as enum ('org', 'course', 'personal');

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete cascade,
  scope public.calendar_scope not null default 'org',
  title text not null,
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint calendar_events_scope_shape check (
    (scope = 'org' and course_id is null and owner_id is null)
    or (scope = 'course' and course_id is not null)
    or (scope = 'personal' and owner_id is not null)
  )
);

create index calendar_events_org_id_idx on public.calendar_events (org_id);
create index calendar_events_course_id_idx on public.calendar_events (course_id);
create index calendar_events_owner_id_idx on public.calendar_events (owner_id);
create index calendar_events_starts_at_idx on public.calendar_events (starts_at);

alter table public.profiles
  add column calendar_token uuid not null default gen_random_uuid();

create unique index profiles_calendar_token_idx on public.profiles (calendar_token);

alter table public.calendar_events enable row level security;

create policy "calendar_events_select_visible" on public.calendar_events
  for select to authenticated
  using (
    org_id = public.current_org_id()
    and (
      (scope = 'org')
      or (scope = 'course' and (public.is_course_member(course_id) or public.current_org_role() = 'admin'))
      or (scope = 'personal' and owner_id = auth.uid())
    )
  );

create policy "calendar_events_write" on public.calendar_events
  for all to authenticated
  using (
    org_id = public.current_org_id()
    and (
      (scope = 'org' and public.current_org_role() = 'admin')
      or (scope = 'course' and (public.is_course_teacher(course_id) or public.current_org_role() = 'admin'))
      or (scope = 'personal' and owner_id = auth.uid())
    )
  )
  with check (
    org_id = public.current_org_id()
    and (
      (scope = 'org' and public.current_org_role() = 'admin')
      or (scope = 'course' and (public.is_course_teacher(course_id) or public.current_org_role() = 'admin'))
      or (scope = 'personal' and owner_id = auth.uid())
    )
  );
