# Madrasah

App terpisah untuk dashboard pembelajaran Madrasah Rabbani Institute.

## Tujuan

- Deploy sebagai project Vercel terpisah.
- Tetap memakai project Supabase yang sama dengan `rabbani-institute`.
- Tetap memakai SSO lintas subdomain lewat cookie domain bersama.

## Environment

Salin `.env.example` ke `.env.local`, lalu isi kredensial Supabase yang sama dengan project induk.

## Menjalankan lokal

```bash
npm install
npm run dev
```

## Catatan database

Jalankan patch [../supabase/madrasah_app_patch.sql](../supabase/madrasah_app_patch.sql) di Supabase agar:

- app slug `madrasah` aktif di Account Center,
- profil administrasi siswa tersimpan di `profiles`,
- form laporan masalah punya tabel sendiri.
