-- Course resources — Moodle-style attachments (links/files) alongside a
-- module's lessons, so a module can hold a mix of content and materials.

create type public.resource_type as enum ('link', 'file');

create table public.course_resources (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  type public.resource_type not null default 'link',
  title text not null,
  description text not null default '',
  url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index course_resources_module_id_idx on public.course_resources (module_id);

alter table public.course_resources enable row level security;

create policy "resources_select_member" on public.course_resources
  for select to authenticated
  using (
    exists (
      select 1 from public.course_modules m
      where m.id = module_id
        and (public.is_course_member(m.course_id) or public.current_org_role() = 'admin')
    )
  );

create policy "resources_write_teacher_or_admin" on public.course_resources
  for all to authenticated
  using (
    exists (
      select 1 from public.course_modules m
      where m.id = module_id
        and (public.is_course_teacher(m.course_id) or public.current_org_role() = 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.course_modules m
      where m.id = module_id
        and (public.is_course_teacher(m.course_id) or public.current_org_role() = 'admin')
    )
  );
