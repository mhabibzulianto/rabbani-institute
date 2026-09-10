-- Rabbani Institute MVP database structure for Supabase.
-- Run this in a fresh Supabase project or adapt it into a timestamped migration.

create type public.user_role as enum ('admin', 'instructor', 'student');
create type public.language_code as enum ('id', 'ar');
create type public.course_status as enum ('draft', 'published', 'archived');
create type public.course_review_status as enum ('draft', 'in_review', 'changes_requested', 'approved');
create type public.lesson_content_type as enum ('video', 'text', 'mixed');
create type public.enrollment_status as enum ('active', 'completed', 'cancelled');

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'student',
  full_name text,
  avatar_url text,
  bio text,
  birth_year integer,
  preferred_language public.language_code not null default 'id',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (full_name is null or char_length(full_name) <= 120),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 800),
  constraint profiles_birth_year_reasonable check (
    birth_year is null or birth_year between 1900 and extract(year from now())::integer
  )
);

create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title_id text not null,
  title_ar text,
  description_id text,
  description_ar text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint categories_title_id_length check (char_length(title_id) between 2 and 120)
);

create table public.courses (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.categories(id) on delete restrict,
  instructor_id uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  status public.course_status not null default 'draft',
  review_status public.course_review_status not null default 'draft',
  title_id text not null,
  title_ar text,
  short_description_id text,
  short_description_ar text,
  description_id text,
  description_ar text,
  goals_id text,
  goals_ar text,
  level text not null default 'Pemula',
  duration_minutes integer not null default 0,
  duration_weeks integer,
  featured boolean not null default false,
  thumbnail_url text,
  published_at timestamptz,
  review_submitted_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint courses_title_id_length check (char_length(title_id) between 3 and 180),
  constraint courses_duration_non_negative check (duration_minutes >= 0),
  constraint courses_duration_weeks_non_negative check (duration_weeks is null or duration_weeks >= 1),
  constraint courses_published_at_required check (status <> 'published' or published_at is not null)
);

create table public.course_review_events (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint course_review_events_action_check check (
    action in ('created', 'submitted', 'approved', 'changes_requested', 'updated')
  )
);

create table public.lessons (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  sort_order integer not null default 0,
  title_id text not null,
  title_ar text,
  content_type public.lesson_content_type not null default 'text',
  video_url text,
  body_id text,
  body_ar text,
  duration_minutes integer not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_title_id_length check (char_length(title_id) between 3 and 180),
  constraint lessons_duration_non_negative check (duration_minutes >= 0),
  constraint lessons_sort_unique unique (course_id, sort_order)
);

create table public.enrollments (
  id bigint generated always as identity primary key,
  course_id bigint not null references public.courses(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status public.enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_student_course_unique unique (student_id, course_id),
  constraint enrollments_completed_at_required check (status <> 'completed' or completed_at is not null)
);

create table public.lesson_progress (
  id bigint generated always as identity primary key,
  lesson_id bigint not null references public.lessons(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz,
  last_position_seconds integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_progress_student_lesson_unique unique (student_id, lesson_id),
  constraint lesson_progress_position_non_negative check (last_position_seconds >= 0)
);

create index profiles_role_idx on public.profiles(role);
create index categories_active_sort_idx on public.categories(is_active, sort_order);
create index courses_category_status_idx on public.courses(category_id, status);
create index courses_review_status_idx on public.courses(review_status, updated_at desc);
create index courses_status_featured_idx on public.courses(status, featured);
create index courses_instructor_id_idx on public.courses(instructor_id);
create index course_review_events_course_idx on public.course_review_events(course_id, created_at desc);
create index lessons_course_sort_idx on public.lessons(course_id, sort_order);
create index enrollments_student_status_idx on public.enrollments(student_id, status);
create index enrollments_course_status_idx on public.enrollments(course_id, status);
create index lesson_progress_student_idx on public.lesson_progress(student_id);
create index lesson_progress_lesson_idx on public.lesson_progress(lesson_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create trigger enrollments_set_updated_at
before update on public.enrollments
for each row execute function public.set_updated_at();

create trigger lesson_progress_set_updated_at
before update on public.lesson_progress
for each row execute function public.set_updated_at();

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select private.current_user_role()) = 'admin', false);
$$;

create or replace function private.can_manage_course(target_course_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select private.current_user_role()) = 'admin'
    or exists (
      select 1
      from public.courses c
      where c.id = target_course_id
        and c.instructor_id = (select auth.uid())
    ),
    false
  );
$$;

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
      and e.student_id = (select auth.uid())
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

grant execute on function private.current_user_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.can_manage_course(bigint) to authenticated;
grant execute on function private.is_enrolled_in_course(bigint) to authenticated;
grant execute on function private.is_course_published(bigint) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_language public.language_code := 'id';
  requested_birth_year integer := null;
begin
  if new.raw_user_meta_data ->> 'preferred_language' in ('id', 'ar') then
    requested_language := (new.raw_user_meta_data ->> 'preferred_language')::public.language_code;
  end if;

  if (new.raw_user_meta_data ->> 'birth_year') ~ '^\d{4}$' then
    requested_birth_year := (new.raw_user_meta_data ->> 'birth_year')::integer;
  end if;

  insert into public.profiles (id, full_name, preferred_language, birth_year)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    requested_language,
    requested_birth_year
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create or replace function public.auth_email_exists(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  return exists (
    select 1
    from auth.users
    where lower(email) = lower(target_email)
  );
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.enforce_course_approval()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  actor_role public.user_role := private.current_user_role();
begin
  if actor_role <> 'admin' then
    new.instructor_id := (select auth.uid());
    new.status := 'draft';
    if tg_op = 'INSERT' then
      new.review_status := 'draft';
    elsif old.review_status = 'approved' or old.status = 'published' then
      new.review_status := 'draft';
    end if;
    new.featured := false;
    new.published_at := null;
  end if;

  return new;
end;
$$;

create trigger courses_enforce_course_approval
before insert or update on public.courses
for each row execute function public.enforce_course_approval();

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role public.user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if not (select private.is_admin()) then
    raise exception 'Only admins can update user roles';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.admin_set_user_role(uuid, public.user_role) to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.courses enable row level security;
alter table public.course_review_events enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;

create policy "Public can read profiles"
on public.profiles
for select
to anon, authenticated
using (true);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own public profile fields"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can manage all profiles"
on public.profiles
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Public can read active categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

create policy "Admins can manage categories"
on public.categories
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "Public can read published courses"
on public.courses
for select
to anon, authenticated
using (status = 'published');

create policy "Students can read enrolled courses"
on public.courses
for select
to authenticated
using ((select private.is_enrolled_in_course(id)));

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
using (instructor_id = auth.uid());

create policy "Instructors and admins can create courses"
on public.courses
for insert
to authenticated
with check (
  (select private.is_admin())
  or (
    (select private.current_user_role()) = 'instructor'
    and instructor_id = (select auth.uid())
  )
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

create policy "Public can read lessons for published courses"
on public.lessons
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.courses c
    where c.id = lessons.course_id
      and c.status = 'published'
  )
);

create policy "Students can read lessons for enrolled courses"
on public.lessons
for select
to authenticated
using ((select private.is_enrolled_in_course(course_id)));

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

create policy "Users can read their own enrollments"
on public.enrollments
for select
to authenticated
using (student_id = (select auth.uid()));

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

create policy "Users can enroll themselves in published courses"
on public.enrollments
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and (select private.is_course_published(course_id))
);

create policy "Users can cancel their own enrollments"
on public.enrollments
for update
to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "Admins can manage all enrollments"
on public.enrollments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);

create policy "Users can read their own lesson progress"
on public.lesson_progress
for select
to authenticated
using (student_id = (select auth.uid()));

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

create policy "Users can create progress for enrolled lessons"
on public.lesson_progress
for insert
to authenticated
with check (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.lessons l
    where l.id = lesson_progress.lesson_id
      and (select private.is_enrolled_in_course(l.course_id))
  )
);

create policy "Users can update their own lesson progress"
on public.lesson_progress
for update
to authenticated
using (student_id = (select auth.uid()))
with check (student_id = (select auth.uid()));

create policy "Admins can delete lesson progress"
on public.lesson_progress
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

revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert (id, full_name, avatar_url, bio, preferred_language) on public.profiles to authenticated;
grant update (full_name, avatar_url, bio, preferred_language) on public.profiles to authenticated;

grant select on public.categories, public.courses, public.lessons to anon, authenticated;
grant insert, update, delete on public.categories, public.courses, public.lessons to authenticated;
grant select on public.course_review_events to authenticated;
grant insert on public.course_review_events to authenticated;
grant select, insert, update, delete on public.enrollments, public.lesson_progress to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.auth_email_exists(text) to anon, authenticated;

insert into public.categories (
  slug,
  title_id,
  title_ar,
  description_id,
  description_ar,
  sort_order
)
values
  (
    'bahasa-arab',
    'Bahasa Arab',
    'اللغة العربية',
    'Kelas bahasa Arab bertahap untuk membaca, memahami, dan menggunakan bahasa Arab dalam studi Islam.',
    'دروس متدرجة في اللغة العربية لفهم النصوص الإسلامية واستخدام العربية.',
    1
  ),
  (
    'ulumul-quran',
    'Ulumul Qur''an',
    'علوم القرآن',
    'Kajian dasar dan lanjutan seputar ilmu-ilmu Al-Qur''an.',
    'دراسة أساسيات علوم القرآن وما يتعلق بها.',
    2
  )
on conflict (slug) do nothing;

insert into public.courses (
  category_id,
  slug,
  status,
  title_id,
  title_ar,
  short_description_id,
  short_description_ar,
  description_id,
  description_ar,
  level,
  duration_minutes,
  featured,
  published_at
)
select
  c.id,
  'bahasa-arab-dasar',
  'published',
  'Bahasa Arab Dasar',
  'أساسيات اللغة العربية',
  'Mulai memahami huruf, kosakata, dan struktur kalimat Arab untuk pembelajar Indonesia.',
  'بداية في فهم الحروف والمفردات وتركيب الجمل العربية.',
  'Kelas pengantar untuk peserta yang ingin belajar bahasa Arab dari fondasi paling penting: pengenalan bunyi, kosakata harian, pola kalimat sederhana, dan latihan membaca teks pendek.',
  'دورة تمهيدية لتعلم العربية من الأساسيات المهمة: الأصوات والمفردات اليومية وأنماط الجمل البسيطة وقراءة النصوص القصيرة.',
  'Pemula',
  240,
  true,
  now()
from public.categories c
where c.slug = 'bahasa-arab'
on conflict (slug) do nothing;

insert into public.courses (
  category_id,
  slug,
  status,
  title_id,
  title_ar,
  short_description_id,
  short_description_ar,
  description_id,
  description_ar,
  level,
  duration_minutes,
  featured,
  published_at
)
select
  c.id,
  'pengantar-ulumul-quran',
  'published',
  'Pengantar Ulumul Qur''an',
  'مدخل إلى علوم القرآن',
  'Memahami tema utama Ulumul Qur''an sebagai bekal membaca dan mengkaji Al-Qur''an.',
  'فهم الموضوعات الأساسية في علوم القرآن تمهيدا لقراءة القرآن ودراسته.',
  'Kelas ini mengenalkan wahyu, kodifikasi mushaf, makki-madani, asbabun nuzul, dan adab berinteraksi dengan Al-Qur''an secara terstruktur.',
  'تعرّف هذه الدورة بالوحي وجمع المصحف والمكي والمدني وأسباب النزول وآداب التعامل مع القرآن.',
  'Pemula',
  210,
  true,
  now()
from public.categories c
where c.slug = 'ulumul-quran'
on conflict (slug) do nothing;

insert into public.lessons (
  course_id,
  sort_order,
  title_id,
  title_ar,
  content_type,
  body_id,
  body_ar,
  duration_minutes,
  is_preview
)
select
  c.id,
  lesson.sort_order,
  lesson.title_id,
  lesson.title_ar,
  lesson.content_type::public.lesson_content_type,
  lesson.body_id,
  lesson.body_ar,
  lesson.duration_minutes,
  lesson.is_preview
from public.courses c
cross join (
  values
    (
      1,
      'Orientasi Belajar Bahasa Arab',
      'تمهيد تعلم العربية',
      'text',
      'Peta belajar, target kelas, dan kebiasaan harian yang membantu pemula bertumbuh stabil.',
      'خطة التعلم وأهداف الدورة والعادات اليومية التي تساعد المبتدئ على التقدم.',
      25,
      true
    ),
    (
      2,
      'Huruf, Bunyi, dan Pengucapan',
      'الحروف والأصوات والنطق',
      'text',
      'Latihan mengenali huruf, makharij dasar, dan pola bunyi yang sering muncul dalam teks Arab.',
      'تدريبات على الحروف والمخارج الأساسية والأنماط الصوتية الشائعة في النصوص العربية.',
      45,
      false
    ),
    (
      3,
      'Kosakata Ibadah Sehari-hari',
      'مفردات العبادات اليومية',
      'text',
      'Kosakata inti yang sering muncul dalam doa, shalat, dan bacaan keislaman sederhana.',
      'مفردات أساسية تكثر في الدعاء والصلاة والقراءات الإسلامية السهلة.',
      50,
      false
    )
) as lesson(sort_order, title_id, title_ar, content_type, body_id, body_ar, duration_minutes, is_preview)
where c.slug = 'bahasa-arab-dasar'
on conflict (course_id, sort_order) do nothing;

insert into public.lessons (
  course_id,
  sort_order,
  title_id,
  title_ar,
  content_type,
  body_id,
  body_ar,
  duration_minutes,
  is_preview
)
select
  c.id,
  lesson.sort_order,
  lesson.title_id,
  lesson.title_ar,
  lesson.content_type::public.lesson_content_type,
  lesson.body_id,
  lesson.body_ar,
  lesson.duration_minutes,
  lesson.is_preview
from public.courses c
cross join (
  values
    (
      1,
      'Apa Itu Ulumul Qur''an',
      'ما هي علوم القرآن',
      'text',
      'Definisi, ruang lingkup, dan manfaat mempelajari Ulumul Qur''an untuk penuntut ilmu.',
      'تعريف علوم القرآن ومجالاتها وفوائد دراستها لطالب العلم.',
      30,
      true
    ),
    (
      2,
      'Wahyu dan Turunnya Al-Qur''an',
      'الوحي ونزول القرآن',
      'text',
      'Gambaran dasar tentang wahyu, proses turunnya Al-Qur''an, dan hikmah penurunannya bertahap.',
      'لمحة أساسية عن الوحي ونزول القرآن وحكمة نزوله منجما.',
      45,
      false
    ),
    (
      3,
      'Makki, Madani, dan Asbabun Nuzul',
      'المكي والمدني وأسباب النزول',
      'text',
      'Pengenalan klasifikasi makki-madani dan peran asbabun nuzul dalam memahami ayat.',
      'تعريف بالمكي والمدني ودور أسباب النزول في فهم الآيات.',
      55,
      false
    )
) as lesson(sort_order, title_id, title_ar, content_type, body_id, body_ar, duration_minutes, is_preview)
where c.slug = 'pengantar-ulumul-quran'
on conflict (course_id, sort_order) do nothing;
