# Publikasi fase 4

## Mengaktifkan

1. Jalankan `supabase/landing_page_publication_patch.sql` setelah patch fondasi. Patch rerunnable; tidak menerbitkan dokumen secara otomatis.
2. Pasang `LANDING_REVALIDATION_SECRET` yang sama (acak, minimal 32 karakter) di environment server **editorial dan situs utama**. Jangan gunakan prefix `NEXT_PUBLIC_` untuk secret. Nilai lokal sudah disiapkan jika sebelumnya belum ada.
3. Di editorial, `LANDING_PUBLIC_ORIGIN` menunjuk origin situs utama. HTTP hanya untuk localhost saat mode development; produksi harus HTTPS.
4. Situs utama memakai `LANDING_CANONICAL_ORIGIN`, default `https://www.rabbaniinstitute.id`. Preview tetap noindex; canonical publik tetap domain utama, bukan editorial/localhost.
5. Restart/deploy kedua aplikasi setelah konfigurasi berubah. Deploy situs utama yang mendukung renderer dan endpoint sinkronisasi terlebih dahulu.

## Alur admin

Di editor, **Terbitkan** menyimpan perubahan terbaru, memeriksa versi server dan menampilkan ringkasan perubahan. Admin mengonfirmasi **Terbitkan sekarang**, dengan catatan opsional. Publikasi atomik melalui RPC: validasi, row lock/CAS, snapshot revisi, dokumen publik, dan status sinkronisasi dibuat dalam transaksi yang sama.

Judul/deskripsi SEO, satu Hero aktif, judul blok, isi teks, tombol, gambar wajib di blok gambar+teks, FAQ dan fitur harus diisi. Alt text tetap opsional. Schema/URL aman/batas struktur diperiksa kembali di database. ID konten manual harus masih publik. Hidden blocks boleh belum lengkap. Publikasi berulang untuk versi yang sama memakai revisi yang sama.

Riwayat di `/halaman-utama/riwayat` menampilkan 20 revisi per halaman, waktu WIB, catatan, preview snapshot, dan restore dengan konfirmasi. Restore memeriksa CAS dan membuat draft versi baru; revisi historis dan snapshot publik tetap utuh. Editor menangani backup lokal dari versi lama sebagai konflik sebelum menimpa server.

## Sinkronisasi

Setelah publikasi commit, editorial mengirim POST ke `/api/landing-revalidate` situs utama. HMAC SHA-256 menandatangani payload persis (home, revisi, nonce acak, timestamp). Bukti permintaan didaftarkan lewat RPC admin sebelum pengiriman. Situs utama memeriksa signature dan batas 5 menit, lalu mengklaim bukti di database sekali pakai sebelum membersihkan tag `landing-home` dan halaman `/`. Bukti tidak bisa dipakai ulang lintas instance.

Status sinkronisasi durable terpisah per revisi, dengan jumlah percobaan, waktu, dan error. Kegagalan jaringan/config tidak membatalkan publikasi yang sudah commit. UI menampilkan **terbit, sinkronisasi tertunda**, dengan tombol retry. Retry hanya untuk revisi yang sedang terbit, menggunakan nonce/bukti baru. Cache snapshot publik mempunyai TTL 300 detik sebagai pemulihan bila callback tidak berhasil. Tidak ada service-role key yang dikirim ke browser.

## Verifikasi

Tes PostgreSQL lokal memeriksa akses role/RLS, CAS publish dan restore, idempotensi, revisi immutable, pemisahan draft/publik, referensi konten, replay/expiry, dan status gagal/retry/sukses. Tes JS memeriksa kesiapan terbit, alt opsional, diff, canonical/metadata dan signature. Uji end-to-end dengan akun admin di Supabase memerlukan patch dan konfigurasi produksi di atas. Tidak ada konten live yang diterbitkan selama pengembangan.
