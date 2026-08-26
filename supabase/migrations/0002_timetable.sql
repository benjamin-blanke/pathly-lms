-- Timetable — rooms, daily periods, and a weekly recurring grid of course slots.

create type public.weekday as enum ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  capacity integer,
  created_at timestamptz not null default now()
);

create index rooms_org_id_idx on public.rooms (org_id);

create table public.periods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  position integer not null default 0,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  unique (org_id, position)
);

create index periods_org_id_idx on public.periods (org_id);

create table public.timetable_entries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  period_id uuid not null references public.periods (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  teacher_id uuid references public.profiles (id) on delete set null,
  weekday public.weekday not null,
  created_at timestamptz not null default now()
);

create index timetable_entries_org_id_idx on public.timetable_entries (org_id);
create index timetable_entries_course_id_idx on public.timetable_entries (course_id);

-- Prevent double-booking a room or a teacher in the same slot.
create unique index timetable_entries_room_slot_idx
  on public.timetable_entries (org_id, room_id, weekday, period_id)
  where room_id is not null;

create unique index timetable_entries_teacher_slot_idx
  on public.timetable_entries (org_id, teacher_id, weekday, period_id)
  where teacher_id is not null;

alter table public.rooms enable row level security;
alter table public.periods enable row level security;
alter table public.timetable_entries enable row level security;

-- Rooms & periods: any org member can view the timetable's building blocks;
-- only org admins manage them.
create policy "rooms_select_org_member" on public.rooms
  for select to authenticated using (org_id = public.current_org_id());

create policy "rooms_write_admin" on public.rooms
  for all to authenticated
  using (org_id = public.current_org_id() and public.current_org_role() = 'admin')
  with check (org_id = public.current_org_id() and public.current_org_role() = 'admin');

create policy "periods_select_org_member" on public.periods
  for select to authenticated using (org_id = public.current_org_id());

create policy "periods_write_admin" on public.periods
  for all to authenticated
  using (org_id = public.current_org_id() and public.current_org_role() = 'admin')
  with check (org_id = public.current_org_id() and public.current_org_role() = 'admin');

-- Timetable entries: visible to the whole org (a school timetable is not a
-- secret); writable by org admins or the course's own teacher.
create policy "timetable_entries_select_org_member" on public.timetable_entries
  for select to authenticated using (org_id = public.current_org_id());

create policy "timetable_entries_write_admin_or_teacher" on public.timetable_entries
  for all to authenticated
  using (
    org_id = public.current_org_id()
    and (public.current_org_role() = 'admin' or public.is_course_teacher(course_id))
  )
  with check (
    org_id = public.current_org_id()
    and (public.current_org_role() = 'admin' or public.is_course_teacher(course_id))
  );
