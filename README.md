# rabbani-institute

Platform e-learning Rabbani Institute berbasis Next.js, Supabase Auth, dan Supabase Postgres.

## Stack

- Next.js App Router
- React
- Supabase Auth
- Supabase Postgres dengan RLS
- Supabase SSR cookies untuk session server-side

## Menjalankan lokal

Install dependency:

```bash
npm install
```

Jalankan dev server:

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
```

## Environment

File `.env.local` sudah disiapkan untuk project ini:

```text
NEXT_PUBLIC_SUPABASE_URL=https://sburerguotljzdgqbkvi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_RABBANI_ALLOWED_ORIGINS=http://localhost:3000
NEXT_PUBLIC_RABBANI_COOKIE_DOMAIN=
```

Untuk production SSO lintas subdomain Rabbani, gunakan contoh:

```text
NEXT_PUBLIC_SITE_URL=https://auth.rabbani-institute.id
NEXT_PUBLIC_RABBANI_ALLOWED_ORIGINS=https://auth.rabbani-institute.id,https://learn.rabbani-institute.id,https://admin.rabbani-institute.id
NEXT_PUBLIC_RABBANI_COOKIE_DOMAIN=.rabbani-institute.id
```

## SSO Rabbani Institute

Fondasi SSO sudah disiapkan dengan pola central auth:

- `/sso?next=...` menjadi pintu masuk login bersama.
- `/auth` menampilkan login/register.
- `/auth/callback` menerima callback Supabase email confirmation/OAuth.
- `NEXT_PUBLIC_RABBANI_ALLOWED_ORIGINS` membatasi tujuan redirect agar tidak open redirect.
- `NEXT_PUBLIC_RABBANI_COOKIE_DOMAIN` disiapkan untuk cookie session lintas subdomain saat memakai domain production.

Catatan: SSO lintas domain berbeda tidak bisa hanya mengandalkan cookie browser biasa. Untuk seluruh project di bawah Rabbani, paling stabil gunakan satu parent domain, misalnya:

- `auth.rabbani-institute.id`
- `learn.rabbani-institute.id`
- `admin.rabbani-institute.id`

Dengan cookie domain `.rabbani-institute.id`, session bisa dipakai bersama oleh subdomain tersebut.

## Supabase

Skema database ada di:

```text
supabase/schema.sql
```

Tabel inti:

- `profiles`
- `categories`
- `courses`
- `lessons`
- `enrollments`
- `lesson_progress`

RLS dasar sudah disiapkan untuk public catalog, siswa, pengajar, dan admin.

## Teacher authoring dan approval

Instructors bisa masuk ke Studio/Admin area untuk membuat dan mengedit course serta lesson miliknya sendiri.

Course yang dibuat teacher dipaksa tetap `draft`. Admin harus approve dengan mengubah status menjadi `published` sebelum course tampil live di katalog.

Workflow review sekarang mencakup:

- `draft`
- `in_review`
- `changes_requested`
- `approved`
- review notes oleh admin
- review history/log per course

Jika database dibuat sebelum workflow review ini ditambahkan, jalankan patch berikut di Supabase SQL Editor:

```text
supabase/review_workflow_patch.sql
```

Patch itu menambahkan kolom `review_status`, review timestamps, tabel `course_review_events`, dan trigger agar non-admin tidak bisa publish, feature, atau reassign course melalui direct API access.

## Membuat admin pertama

Setelah register akun pertama, jalankan di Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id
  from auth.users
  where email = 'email-kamu@example.com'
);
```

## Halaman MVP

- `/` homepage
- `/courses` katalog kelas
- `/courses/[slug]` detail kelas
- `/auth` login/register
- `/dashboard` dashboard siswa
- `/learn/[slug]` halaman belajar
- `/admin` admin/staff overview
- `/admin/users` admin-only role management
- `/admin/courses` course management dan approval queue
- `/admin/courses/new` create course draft
- `/admin/courses/[id]/edit` bilingual course editor
- `/admin/courses/[id]/lessons` lesson builder
- `/admin/categories` admin-only category management
- `/sso?next=/dashboard` entry SSO
- `/email-template` preview template email HTML

## Template email

Template email yang mengikuti desain website tersedia di:

```text
components/email/RabbaniEmailTemplate.js
lib/email.js
```

Untuk menghasilkan HTML email siap kirim:

```js
import { renderRabbaniEmail } from "@/lib/email";

const html = renderRabbaniEmail({
  title: "Judul email",
  body: "Isi email",
  ctaHref: "https://rabbani-institute.id/courses",
});
```
