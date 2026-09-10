# OSBAN

Landing page terpisah untuk OSBAN yang dideploy sebagai project Vercel sendiri dan dipasang di `www.rabbaniinstitute.id/osban.id`.

## Deploy ke Vercel

1. Buat project Vercel baru.
2. Pilih repository yang sama.
3. Set **Root Directory** ke `osban.id`.
4. Deploy.
5. Hubungkan project utama agar me-rewrite path `/osban.id` ke deployment ini.

## Supabase

Project ini disiapkan sebagai frontend terpisah, tetapi tetap bisa memakai project Supabase yang sama dengan website utama. Saat fitur OSBAN mulai memakai auth, database, atau storage, isi env berikut dengan nilai Supabase yang sama:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
