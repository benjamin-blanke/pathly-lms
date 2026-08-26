-- Fix: the original announcements policy required `author_id = auth.uid()`
-- in its WITH CHECK clause. For UPDATE, Postgres re-validates the *entire*
-- resulting row against WITH CHECK — including columns the statement never
-- touched — so an admin editing another admin's announcement (without
-- reassigning authorship) would have the update silently rejected, because
-- the untouched author_id still belonged to the original author. Drop that
-- requirement; the role/teacher checks already scope who can write.

drop policy "announcements_write_admin_or_teacher" on public.announcements;

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
    and (
      public.current_org_role() = 'admin'
      or (course_id is not null and public.is_course_teacher(course_id))
    )
  );
