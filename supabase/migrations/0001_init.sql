-- Pathly LMS — initial schema
-- Multi-tenant (organizations), RBAC (profiles.role + course-level enrollments),
-- courses/modules/lessons, assignments/submissions/grading, announcements.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.org_role as enum ('admin', 'teacher', 'student');
create type public.course_role as enum ('teacher', 'student');
create type public.submission_status as enum ('draft', 'submitted', 'graded', 'returned');

-- ---------------------------------------------------------------------------
-- Organizations (tenants)
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (1 row per auth user, scoped to one organization)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role public.org_role not null default 'student',
  full_name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles (org_id);

-- ---------------------------------------------------------------------------
-- Courses / Modules / Lessons
-- ---------------------------------------------------------------------------
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null,
  description text not null default '',
  code text not null default '',
  created_by uuid not null references public.profiles (id),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index courses_org_id_idx on public.courses (org_id);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index course_modules_course_id_idx on public.course_modules (course_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  title text not null,
  content text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index lessons_module_id_idx on public.lessons (module_id);

-- ---------------------------------------------------------------------------
-- Enrollments (course-level role)
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.course_role not null default 'student',
  created_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index enrollments_course_id_idx on public.enrollments (course_id);
create index enrollments_user_id_idx on public.enrollments (user_id);

-- ---------------------------------------------------------------------------
-- Assignments / Submissions (grading fields live on the submission)
-- ---------------------------------------------------------------------------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  description text not null default '',
  due_at timestamptz,
  points_possible numeric not null default 100,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index assignments_course_id_idx on public.assignments (course_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  content text not null default '',
  file_url text,
  status public.submission_status not null default 'draft',
  submitted_at timestamptz,
  score numeric,
  feedback text,
  graded_by uuid references public.profiles (id),
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create index submissions_assignment_id_idx on public.submissions (assignment_id);
create index submissions_student_id_idx on public.submissions (student_id);

-- ---------------------------------------------------------------------------
-- Announcements (org-wide or scoped to a course)
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now()
);

create index announcements_org_id_idx on public.announcements (org_id);
create index announcements_course_id_idx on public.announcements (course_id);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion on profiles)
-- ---------------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_org_role()
returns public.org_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_course_member(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = target_course_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_course_teacher(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = target_course_id and user_id = auth.uid() and role = 'teacher'
  ) or exists (
    select 1 from public.courses
    where id = target_course_id and created_by = auth.uid()
  );
$$;

-- Auto-enroll the creator of a course as its teacher.
create or replace function public.handle_new_course()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.enrollments (course_id, user_id, role)
  values (new.id, new.created_by, 'teacher')
  on conflict (course_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_course_created
  after insert on public.courses
  for each row execute function public.handle_new_course();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.announcements enable row level security;

-- Organizations: any authenticated user can look up basic org info (needed to
-- join by slug during onboarding); only members can be considered "in" one.
create policy "organizations_select_authenticated" on public.organizations
  for select to authenticated using (true);

create policy "organizations_insert_authenticated" on public.organizations
  for insert to authenticated with check (true);

create policy "organizations_update_admin" on public.organizations
  for update to authenticated
  using (id = public.current_org_id() and public.current_org_role() = 'admin');

-- Profiles: visible within the same org; users manage their own row; admins
-- can update roles within their org.
create policy "profiles_select_same_org" on public.profiles
  for select to authenticated using (org_id = public.current_org_id());

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated
  using (id = auth.uid() or (org_id = public.current_org_id() and public.current_org_role() = 'admin'));

-- Courses: any member of the org can see the course catalog (title,
-- description, code); actual materials (modules/lessons/assignments) are
-- gated separately by enrollment. Teachers/admins can create; creator or
-- org admin can update/delete.
create policy "courses_select_org_member" on public.courses
  for select to authenticated
  using (org_id = public.current_org_id());

create policy "courses_insert_teacher_or_admin" on public.courses
  for insert to authenticated
  with check (
    org_id = public.current_org_id()
    and public.current_org_role() in ('admin', 'teacher')
    and created_by = auth.uid()
  );

create policy "courses_update_owner_or_admin" on public.courses
  for update to authenticated
  using (
    org_id = public.current_org_id()
    and (public.current_org_role() = 'admin' or public.is_course_teacher(id))
  );

create policy "courses_delete_owner_or_admin" on public.courses
  for delete to authenticated
  using (
    org_id = public.current_org_id()
    and (public.current_org_role() = 'admin' or created_by = auth.uid())
  );

-- Modules / lessons: readable by course members, writable by course teachers/admins.
create policy "modules_select_member" on public.course_modules
  for select to authenticated
  using (public.is_course_member(course_id) or public.current_org_role() = 'admin');

create policy "modules_write_teacher_or_admin" on public.course_modules
  for all to authenticated
  using (public.is_course_teacher(course_id) or public.current_org_role() = 'admin')
  with check (public.is_course_teacher(course_id) or public.current_org_role() = 'admin');

create policy "lessons_select_member" on public.lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.course_modules m
      where m.id = module_id
        and (public.is_course_member(m.course_id) or public.current_org_role() = 'admin')
    )
  );

create policy "lessons_write_teacher_or_admin" on public.lessons
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

-- Enrollments: course members can see their course roster; teachers/admins
-- manage enrollments; students may enroll themselves.
create policy "enrollments_select_member" on public.enrollments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_course_member(course_id)
    or public.current_org_role() = 'admin'
  );

create policy "enrollments_insert_self_or_teacher" on public.enrollments
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.is_course_teacher(course_id)
    or public.current_org_role() = 'admin'
  );

create policy "enrollments_delete_teacher_or_admin" on public.enrollments
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_course_teacher(course_id)
    or public.current_org_role() = 'admin'
  );

-- Assignments: readable by course members, writable by course teachers/admins.
create policy "assignments_select_member" on public.assignments
  for select to authenticated
  using (public.is_course_member(course_id) or public.current_org_role() = 'admin');

create policy "assignments_write_teacher_or_admin" on public.assignments
  for all to authenticated
  using (public.is_course_teacher(course_id) or public.current_org_role() = 'admin')
  with check (public.is_course_teacher(course_id) or public.current_org_role() = 'admin');

-- Submissions: a student can see/edit their own; teachers/admins of the
-- course can see and grade all submissions for it.
create policy "submissions_select_own_or_teacher" on public.submissions
  for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (public.is_course_teacher(a.course_id) or public.current_org_role() = 'admin')
    )
  );

create policy "submissions_insert_own" on public.submissions
  for insert to authenticated
  with check (student_id = auth.uid());

create policy "submissions_update_own_or_teacher" on public.submissions
  for update to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.assignments a
      where a.id = assignment_id
        and (public.is_course_teacher(a.course_id) or public.current_org_role() = 'admin')
    )
  );

-- Announcements: readable by org members (and course members when scoped to
-- a course); writable by org admins or the course's teachers.
create policy "announcements_select_visible" on public.announcements
  for select to authenticated
  using (
    org_id = public.current_org_id()
    and (course_id is null or public.is_course_member(course_id) or public.current_org_role() = 'admin')
  );

create policy "announcements_write_admin_or_teacher" on public.announcements
  for all to authenticated
  using (
    org_id = public.current_org_id()
    and (
      public.current_org_role() = 'admin'
      or (course_id is not null and public.is_course_teacher(course_id))
    )
  )
  with check (
    org_id = public.current_org_id()
    and author_id = auth.uid()
    and (
      public.current_org_role() = 'admin'
      or (course_id is not null and public.is_course_teacher(course_id))
    )
  );
