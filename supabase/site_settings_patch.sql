create table if not exists public.site_settings (
  id bigint primary key,
  contact_heading text not null default 'Hubungi Rabbani Institute melalui jalur resmi',
  contact_intro text not null default 'Gunakan kanal resmi Rabbani Institute untuk pertanyaan kelas, artikel, ujian, pembayaran, dan kendala akun.',
  contact_email text not null default 'admin@rabbaniinstitute.id',
  contact_whatsapp_label text not null default 'WhatsApp Admin',
  contact_whatsapp_number text,
  contact_hours text not null default 'Senin - Sabtu, 08.00 - 17.00 WIB',
  contact_address text not null default 'Layanan digital Rabbani Institute',
  contact_notice text not null default 'Jangan kirim password atau kode OTP ke siapa pun. Admin hanya memerlukan informasi yang relevan untuk membantu akun atau layananmu.',
  floating_enabled boolean not null default true,
  floating_label text not null default 'Butuh bantuan?',
  floating_whatsapp_number text,
  floating_message text not null default 'Assalamu''alaikum, saya ingin bertanya tentang Rabbani Institute.',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint site_settings_singleton check (id = 1)
);

insert into public.site_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings
for select
to public
using (true);

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
on public.site_settings
for update
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

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
on public.site_settings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  )
);
