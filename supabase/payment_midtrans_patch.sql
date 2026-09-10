alter table public.courses
  add column if not exists price_idr integer not null default 0;

alter table public.courses
  drop constraint if exists courses_price_idr_non_negative;

alter table public.courses
  add constraint courses_price_idr_non_negative
  check (price_idr >= 0);

create table if not exists public.payment_transactions (
  id bigint generated always as identity primary key,
  order_id text not null unique,
  course_id bigint references public.courses(id) on delete set null,
  student_id uuid references public.profiles(id) on delete set null,
  amount_idr integer not null default 0,
  snap_token text,
  snap_redirect_url text,
  transaction_status text not null default 'pending',
  payment_type text,
  status_code text,
  fraud_status text,
  raw_payload jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_transactions_amount_non_negative check (amount_idr >= 0)
);

create index if not exists payment_transactions_student_created_idx
  on public.payment_transactions(student_id, created_at desc);

create index if not exists payment_transactions_course_created_idx
  on public.payment_transactions(course_id, created_at desc);

drop trigger if exists payment_transactions_set_updated_at on public.payment_transactions;
create trigger payment_transactions_set_updated_at
before update on public.payment_transactions
for each row execute function public.set_updated_at();

alter table public.payment_transactions enable row level security;

create policy "Users can read own payment transactions"
on public.payment_transactions
for select
to authenticated
using (student_id = auth.uid());

create policy "Users can create own payment transactions"
on public.payment_transactions
for insert
to authenticated
with check (student_id = auth.uid());

create policy "Users can update own payment transactions"
on public.payment_transactions
for update
to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

create policy "Admins can manage payment transactions"
on public.payment_transactions
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

grant select, insert, update on public.payment_transactions to authenticated;

update public.courses
set price_idr = case slug
  when 'bahasa-arab-dasar' then 149000
  when 'pengantar-ulumul-quran' then 129000
  else price_idr
end
where slug in ('bahasa-arab-dasar', 'pengantar-ulumul-quran');
