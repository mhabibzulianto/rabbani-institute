begin;

create or replace function private.is_enrolled_in_course(target_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.enrollments e
    where e.course_id = target_course_id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  );
$$;

create or replace function private.is_course_published(target_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses c
    where c.id = target_course_id
      and c.status = 'published'
  );
$$;

grant execute on function private.is_enrolled_in_course(bigint) to authenticated;
grant execute on function private.is_course_published(bigint) to authenticated;

drop policy if exists "Students can read enrolled courses" on public.courses;
drop policy if exists "Users can enroll themselves in published courses" on public.enrollments;

create policy "Students can read enrolled courses"
on public.courses
for select
to authenticated
using ((select private.is_enrolled_in_course(id)));

create policy "Users can enroll themselves in published courses"
on public.enrollments
for insert
to authenticated
with check (
  student_id = auth.uid()
  and (select private.is_course_published(course_id))
);

commit;
