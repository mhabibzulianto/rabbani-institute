-- Deprecated: this patch is superseded by course_models_patch.sql for the new dual course model.
-- Keep this file only for historical reference on the old schema.
--
-- Sync staff/admin access policies for courses and related authoring tables.
-- This patch makes instructor ownership explicit:
-- - Admin can assign an existing course to any instructor
-- - The assigned instructor can immediately see and manage that course in Studio
-- - Admin keeps full access across courses, lessons, reviews, enrollments, and progress

begin;

drop policy if exists "Students can read enrolled courses" on public.courses;
drop policy if exists "Admins can read all courses" on public.courses;
drop policy if exists "Instructors can read own courses" on public.courses;
drop policy if exists "Course owners and admins can update courses" on public.courses;
drop policy if exists "Admins can delete courses" on public.courses;

create policy "Students can read enrolled courses"
on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.enrollments e
    where e.course_id = courses.id
      and e.student_id = auth.uid()
      and e.status in ('active', 'completed')
  )
);

create policy "Admins can read all courses"
on public.courses
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Instructors can read own courses"
on public.courses
for select
to authenticated
using (
  instructor_id = auth.uid()
);

create policy "Course owners and admins can update courses"
on public.courses
for update
to authenticated
using (
  instructor_id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  (
    instructor_id = auth.uid()
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'instructor'
    )
  )
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Admins can delete courses"
on public.courses
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Course owners and admins can read review events" on public.course_review_events;
drop policy if exists "Course owners and admins can create review events" on public.course_review_events;

create policy "Course owners and admins can read review events"
on public.course_review_events
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = course_review_events.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

create policy "Course owners and admins can create review events"
on public.course_review_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.courses c
    where c.id = course_review_events.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Course owners and admins can manage lessons" on public.lessons;

create policy "Course owners and admins can manage lessons"
on public.lessons
for all
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = lessons.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.courses c
    where c.id = lessons.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Course owners and admins can read course enrollments" on public.enrollments;

create policy "Course owners and admins can read course enrollments"
on public.enrollments
for select
to authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = enrollments.course_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

drop policy if exists "Course owners and admins can read lesson progress" on public.lesson_progress;

create policy "Course owners and admins can read lesson progress"
on public.lesson_progress
for select
to authenticated
using (
  exists (
    select 1
    from public.lessons l
    join public.courses c on c.id = l.course_id
    where l.id = lesson_progress.lesson_id
      and (
        c.instructor_id = auth.uid()
        or exists (
          select 1
          from public.profiles p
          where p.id = auth.uid()
            and p.role = 'admin'
        )
      )
  )
);

commit;
