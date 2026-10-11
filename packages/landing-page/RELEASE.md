# Fase 5: verifikasi dan rilis

## Hasil lokal

Penyempurnaan mencakup fokus pengaturan setelah memilih/menambah/menghapus blok, hubungan kontrol dengan panel, target tombol mobile minimal 44 px, input mobile 16 px, dan reduced motion. Pengurutan tetap tersedia lewat tombol naik/turun tanpa drag.

Renderer memuat gambar Hero pertama dengan eager/high priority; gambar lain lazy dan decoding async. Heading rich text mengikuti hierarki bagian tanpa mengubah dokumen tersimpan. Alt text tetap opsional. Cache koleksi publik dibatasi 300 detik dan dibersihkan bersama snapshot lewat tag `landing-home`; kunci cache hanya berisi permintaan koleksi, bukan draft atau token preview.

Endpoint preview dan sinkronisasi membatasi pembacaan body 1.024 byte, termasuk transfer tanpa Content-Length. Form preview menerima satu field ticket melalui URL-encoded form. SQL fase 5 menolak teks wajib yang hanya whitespace serta URL gambar berupa fragment.

Verifikasi 11 Oktober 2026: tes Node/PostgreSQL lokal, lint editorial, build produksi kedua proyek, renderer desktop 1440 px/mobile 390 px tanpa overflow, satu H1, serta endpoint lokal untuk akses anonim, Origin, tiket tidak valid/duplikat, signature dan ukuran body. Supabase nyata sudah memiliki tabel/RPC fase 3–4 dan menolak pembacaan anonim tabel tiket/sinkronisasi. Alur UI admin dan smoke publikasi produksi belum dijalankan.

## Urutan rilis

1. Jalankan `supabase/landing_page_hardening_patch.sql` setelah patch fase 4. Patch dapat diulang, tidak mengubah data, dan tidak menerbitkan landing.
2. Konfigurasi server kedua proyek: `LANDING_REVALIDATION_SECRET` harus identik, acak, minimal 32 karakter, tanpa prefix NEXT_PUBLIC. Editorial: `LANDING_PUBLIC_ORIGIN=https://www.rabbaniinstitute.id`. Situs utama: `LANDING_CANONICAL_ORIGIN=https://www.rabbaniinstitute.id`.
3. Deploy situs utama dengan renderer/API terlebih dahulu. Deploy editorial dengan root directory `editorial`, akses file di luar root aktif; shared package berada di `packages/landing-page`. File tracing editorial secara eksplisit menunjuk root monorepo.
4. Smoke dengan akun admin pada konten yang disetujui: catat revisi publik awal; ubah draft dan pastikan publik belum berubah; buka preview desktop/mobile; terbitkan dan cek canonical, konten serta status sinkronisasi; ulangi request untuk memastikan tidak ada revisi ganda; restore revisi awal menjadi draft, lalu terbitkan untuk mengembalikan tampilan publik.
5. Uji akun instruktur/penulis: menu tersembunyi, URL ditolak, dan RPC save/publish/restore/mint preview tidak dapat dipakai. Preview yang kedaluwarsa atau tiket yang digunakan ulang harus ditolak.
6. Jika callback gagal, gunakan Coba sinkronisasi lagi. Publikasi sudah tersimpan; jangan menerbitkan ulang sekadar untuk memperbaiki cache.

Rilis produksi belum dilakukan dari sesi ini karena akses deployment Vercel tidak tersedia. Jangan menandai fase 5 selesai produksi sebelum patch tambahan, konfigurasi, deployment kedua proyek, dan smoke admin di atas terverifikasi.
