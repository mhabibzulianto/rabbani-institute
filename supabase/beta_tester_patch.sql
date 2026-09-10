begin;

alter table public.profiles
  add column if not exists is_beta_tester boolean not null default false;

do $$
begin
  begin
    alter type public.course_status add value 'beta' after 'draft';
  exception
    when duplicate_object then null;
  end;
end $$;

commit;

begin;

create or replace function private.can_self_enroll_in_course(target_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses c
    left join public.profiles p on p.id = auth.uid()
    where c.id = target_course_id
      and (
        c.status = 'published'
        or (c.status = 'beta' and coalesce(p.is_beta_tester, false))
      )
  );
$$;

grant execute on function private.can_self_enroll_in_course(bigint) to authenticated;

drop policy if exists "Public can read published courses" on public.courses;
drop policy if exists "Public can read published and beta courses" on public.courses;

create policy "Public can read published and beta courses"
on public.courses
for select
to anon, authenticated
using (status in ('published', 'beta'));

drop policy if exists "Users can enroll themselves in published courses" on public.enrollments;

create policy "Users can enroll themselves in published courses"
on public.enrollments
for insert
to authenticated
with check (
  student_id = auth.uid()
  and (select private.can_self_enroll_in_course(course_id))
);

commit;
