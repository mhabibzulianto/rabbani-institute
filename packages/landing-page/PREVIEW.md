# Renderer dan preview fase 3

Renderer React `Renderer.jsx` dipakai situs utama untuk landing publik dan preview. `lib/landing.js` proyek utama membaca hanya `landing_page_publications`, memvalidasi dokumen, dan memakai default bila belum terbit, schema tidak kompatibel, atau database tidak tersedia. Cache snapshot maksimal 300 detik. Draft tidak pernah digunakan sebagai fallback publik.

Data dinamis menggunakan Supabase public client. Hanya jenis blok aktif diambil; latest dibatasi maksimum 12 per jenis, dan ID pilihan manual dibatch serta difilter status publik. Urutan ID manual dipertahankan; ID yang tidak lagi publik dilewati. Kartu kelas/artikel dan formatter ujian memakai komponen situs utama. Navbar/footer berasal dari root layout situs utama.

## Mengaktifkan preview

1. Jalankan `supabase/landing_page_preview_patch.sql` setelah patch fondasi. Patch dapat dijalankan ulang dan tidak menerbitkan landing.
2. Atur `LANDING_PUBLIC_ORIGIN` di aplikasi editorial menjadi origin aplikasi utama, misalnya `http://localhost:3000` untuk pengembangan atau `https://www.rabbaniinstitute.id` untuk produksi. Restart aplikasi setelah mengubah env.
3. Jalankan aplikasi utama dan editorial. Di editor Halaman utama, pilih **Preview situs**. Pilihan Desktop/Mobile mengubah ukuran iframe yang memuat renderer asli situs utama.

Preview mengambil snapshot isi editor saat tombol ditekan, termasuk perubahan yang belum disimpan, tanpa memperbarui draft atau publikasi. Tiket hanya admin yang dapat membuat, berlaku 2 menit dan sekali pakai. Tiket di fragment URL ditukar lewat POST menjadi cookie HttpOnly host-only yang berlaku 30 menit. Database menyimpan hash token; tabel tiket/sesi tidak dapat dibaca langsung oleh anon maupun authenticated. Sesi ditolak jika admin pembuat tidak lagi admin. URL preview tanpa cookie tidak membuka draft. Header no-store/noindex/no-referrer dipasang pada jalur preview. Tidak memerlukan service role atau secret bersama lintas aplikasi.

Tes SQL lokal mencakup rerun migrasi, penolakan non-admin, akses tabel langsung, exchange sekali pakai, tiket/sesi kedaluwarsa, revokasi role, dan pemisahan snapshot publik. Smoke test lintas aplikasi dengan login admin tetap membutuhkan patch tersebut diterapkan ke Supabase.

Publikasi, riwayat, restore dan revalidasi lintas aplikasi dilanjutkan pada fase 4.
