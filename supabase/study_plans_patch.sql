begin;

create table if not exists public.study_plans (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived', 'converted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_items (
  id bigserial primary key,
  study_plan_id bigint not null references public.study_plans(id) on delete cascade,
  course_id bigint not null references public.courses(id) on delete cascade,
  note text,
  priority_order integer,
  snapshot_price_idr integer,
  snapshot_title text,
  snapshot_status text,
  selection_state text not null default 'active'
    check (selection_state in ('active', 'removed', 'converted', 'invalid')),
  conversion_order_id text,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists study_plans_one_active_per_user
  on public.study_plans (user_id)
  where status = 'active';

create unique index if not exists study_plan_items_unique_active_course
  on public.study_plan_items (study_plan_id, course_id)
  where selection_state = 'active';

create index if not exists study_plan_items_plan_state_idx
  on public.study_plan_items (study_plan_id, selection_state, added_at desc);

create index if not exists study_plan_items_course_idx
  on public.study_plan_items (course_id);

alter table public.study_plans enable row level security;
alter table public.study_plan_items enable row level security;

drop policy if exists "study_plans_select_own" on public.study_plans;
create policy "study_plans_select_own"
  on public.study_plans
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "study_plans_insert_own" on public.study_plans;
create policy "study_plans_insert_own"
  on public.study_plans
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "study_plans_update_own" on public.study_plans;
create policy "study_plans_update_own"
  on public.study_plans
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "study_plan_items_select_own" on public.study_plan_items;
create policy "study_plan_items_select_own"
  on public.study_plan_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.study_plans sp
      where sp.id = study_plan_items.study_plan_id
        and sp.user_id = auth.uid()
    )
  );

drop policy if exists "study_plan_items_insert_own" on public.study_plan_items;
create policy "study_plan_items_insert_own"
  on public.study_plan_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.study_plans sp
      where sp.id = study_plan_items.study_plan_id
        and sp.user_id = auth.uid()
    )
  );

drop policy if exists "study_plan_items_update_own" on public.study_plan_items;
create policy "study_plan_items_update_own"
  on public.study_plan_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.study_plans sp
      where sp.id = study_plan_items.study_plan_id
        and sp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.study_plans sp
      where sp.id = study_plan_items.study_plan_id
        and sp.user_id = auth.uid()
    )
  );

create or replace function public.touch_study_plan_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_study_plans_updated_at on public.study_plans;
create trigger touch_study_plans_updated_at
before update on public.study_plans
for each row execute function public.touch_study_plan_updated_at();

drop trigger if exists touch_study_plan_items_updated_at on public.study_plan_items;
create trigger touch_study_plan_items_updated_at
before update on public.study_plan_items
for each row execute function public.touch_study_plan_updated_at();

commit;
