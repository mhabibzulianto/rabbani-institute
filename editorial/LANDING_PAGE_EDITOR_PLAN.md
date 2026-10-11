# Rencana block editor landing page Rabbani Institute

Status: fase 1–4 diimplementasikan dan patch Supabase fase 3–4 dikonfirmasi sudah dijalankan. Penyempurnaan kode fase 5 serta verifikasi lokal selesai. Rilis produksi masih menunggu patch landing_page_hardening_patch.sql, konfigurasi/deployment kedua aplikasi, dan smoke admin. Lihat ../packages/landing-page/RELEASE.md.

## Tujuan dan kondisi saat ini

Admin mengelola landing page utama rabbaniinstitute.id melalui menu Halaman utama di aplikasi editorial. Perubahan disimpan sebagai draft, diperiksa melalui preview, lalu diterbitkan tanpa mengubah kode untuk setiap pembaruan konten.

- Landing utama masih berupa JSX di proyek induk `app/page.js`: hero, tentang/fitur, kelas, ujian, artikel, dan CTA.
- Kelas, ujian, dan artikel mengambil data publik dari sumber yang sudah ada.
- Halaman editorial `/halaman-utama` masih placeholder. Deskripsinya perlu diperbaiki menjadi landing situs utama.
- `AppShell` menampilkan menu tersebut tanpa filter role, termasuk pada menu tambahan mobile.
- Dashboard sudah mempunyai autentikasi editorial, tetapi halaman ini membutuhkan pemeriksaan admin tambahan.
- `site_settings` saat ini menyimpan kontak dan tombol bantuan; dokumen landing disimpan terpisah agar draft dan riwayat tidak tercampur dengan pengaturan situs.

## Batas MVP

Editor blok dengan komponen dan pilihan tampilan yang sudah ditentukan. Admin dapat mengubah isi, mengurutkan, menggandakan, menyembunyikan, menambah, dan menghapus blok. Tidak menyediakan HTML/JavaScript/CSS bebas atau pengaturan layout tanpa batas.

Tiptap dipakai hanya untuk teks kaya di dalam blok teks, bukan sebagai mesin layout seluruh halaman. Landing dirender dari JSON blok oleh komponen React. Navbar, footer global, halaman akun/SSO, serta halaman Tentang/Kontak tetap di luar cakupan MVP.

## Rancangan pengalaman pengguna

- `/halaman-utama`: ringkasan status draft, waktu publikasi terakhir dalam WIB, dan tombol Buka editor, Preview, serta Riwayat.
- `/halaman-utama/edit`: halaman editor khusus; header berisi kembali ke dashboard, judul halaman, status simpan, Preview, dan Terbitkan.
- Desktop: daftar blok di kiri, kanvas di tengah, pengaturan blok terpilih di kanan.
- Mobile: kanvas utama, daftar blok dan pengaturan melalui panel yang dapat dibuka; tombol pindah naik/turun tersedia selain drag-and-drop.
- Tombol tambah blok pada kanvas; setiap blok memiliki aksi duplikat, sembunyikan, hapus, dan urutkan.
- Preview memakai renderer situs utama, dengan pilihan viewport desktop/mobile. Perubahan draft tidak tampil kepada pengunjung umum.
- Draft otomatis disimpan secara bertahap, dengan tombol simpan manual, indikator gagal, retry, dan peringatan ketika meninggalkan perubahan yang belum tersimpan.
- Publikasi menampilkan ringkasan perubahan yang akan diterapkan. Konflik perubahan admin lain harus ditangani tanpa menimpa diam-diam.

## Katalog blok awal

| Blok | Isi yang dapat diubah |
| --- | --- |
| Hero | Label, judul, deskripsi, gambar opsional, posisi gambar, satu/dua CTA |
| Teks | Judul dan isi Tiptap terbatas: paragraf, penekanan, daftar, tautan |
| Fitur | Judul bagian dan daftar fitur dengan ikon dari katalog, judul, deskripsi |
| Gambar + teks | Gambar media, alt opsional, caption, judul, isi, CTA, posisi gambar |
| Kelas | Judul, deskripsi, jumlah, sumber terbaru atau kelas terpilih, tautan katalog |
| Ujian | Judul, deskripsi, jumlah, sumber ujian publik atau pilihan manual, empty state |
| Artikel | Judul, deskripsi, jumlah, terbaru atau artikel terpilih, tautan arsip |
| CTA | Judul, deskripsi, satu/dua tombol, variasi latar yang disediakan |
| FAQ | Judul bagian, pertanyaan dan jawaban |

Kelas, ujian, dan artikel hanya menampilkan data yang boleh diakses publik. Admin tidak menyalin konten atau harga ke JSON landing. Pilihan manual hanya menyimpan ID. Item yang tidak lagi publik dilewati dengan empty state yang sesuai. Semua jenis blok mempunyai ID stabil, tipe, properti, status terlihat, dan variasi desain terbatas.

## Model data dan integrasi

- `landing_pages`: identitas halaman (slug `home`), `draft_document`, `published_document`, `draft_version`, `published_revision_id`, siapa/waktu memperbarui dan menerbitkan.
- Format dokumen: `{ schemaVersion, seo, blocks: [{ id, type, enabled, props }] }`.
- `landing_page_revisions`: snapshot saat publikasi/restore, nomor revisi, admin, waktu, dan catatan perubahan. Snapshot publik tidak boleh berubah.
- Published document diperbarui bersama revision dalam satu transaksi RPC. Draft tidak dapat dipublikasikan melalui update tabel biasa.
- Simpan draft menggunakan expected version agar dua admin tidak saling menimpa.
- Restore mengambil revisi menjadi draft baru terlebih dahulu; admin melakukan preview dan publikasi untuk mengaktifkannya.
- Publik hanya mempunyai akses baca snapshot yang sudah diterbitkan, melalui view/RPC atau tabel snapshot khusus. Jangan memberi SELECT publik ke row yang berisi draft.
- Gunakan akun Supabase dan autentikasi yang sudah ada; browser tidak menerima service-role key.
- Renderer dan schema blok dibagi sebagai package lokal dalam monorepo, dengan satu sumber default konten. Sesuaikan resolusi package dan proses build kedua aplikasi agar tidak kembali mewarisi konfigurasi CSS yang berbeda.
- Renderer proyek utama tetap menggunakan CourseCard, ArticleCard, serta akses data ujian yang sudah ada. Pengambilan data hanya dijalankan untuk blok aktif, dibatasi, dan dibatch.
- Jalur khusus host account di `app/page.js` dipertahankan sebelum render landing.
- Migrasi dimulai dengan konten landing sekarang sebagai default. Jika belum ada snapshot publik atau schema belum dipasang, renderer menggunakan default ini. Gangguan data memakai snapshot terakhir yang tersedia/default dan dicatat untuk diagnosis.
- Publikasi memanggil endpoint revalidasi yang terautentikasi di proyek utama: validasi signature, timestamp, batas replay, serta target halaman yang dibolehkan. `revalidateTag` di editorial saja tidak membersihkan cache aplikasi utama.
- Bila revalidasi gagal setelah transaksi publikasi berhasil, tampilkan status publikasi berhasil namun sinkronisasi tertunda; retry secara idempotent. Cache publik mempunyai TTL terbatas sebagai pemulihan.
- Media memakai pustaka yang sudah tersedia, dengan pemeriksaan MIME, ukuran, URL, serta akses publik. Alt text opsional; gambar dekoratif memakai alt kosong.

## Fase pengembangan

### Fase 1 — fondasi dan akses admin

1. Filter menu Halaman utama hanya ketika `profile.role === 'admin'`, pada sidebar desktop dan menu tambahan mobile.
2. Tambahkan helper pemeriksaan admin untuk halaman overview, editor, preview draft, riwayat, dan setiap server action/API.
3. Tetapkan schema blok, batas ukuran/jumlah/nesting, validasi server, dan versi dokumen.
4. Tambahkan SQL patch `landing_page_editor_patch.sql` untuk dokumen, snapshot, RPC, grant, dan RLS admin. Draft dan riwayat tidak boleh dibaca publik.
5. Siapkan default dokumen yang mencerminkan landing saat ini dan komponen/schema bersama.

Selesai jika non-admin tidak melihat menu dan tidak bisa mengakses URL langsung, membaca draft, atau memanggil operasi perubahan. Migrasi dapat dijalankan ulang dan situs tetap berjalan dengan default.

### Fase 2 — editor blok MVP

1. Bangun overview dan halaman editor khusus.
2. Implementasikan katalog blok awal, form tiap blok, tambah, duplikat, hapus, sembunyikan, dan urutkan.
3. Integrasikan Tiptap terbatas untuk isi teks dan pemilihan media dari library.
4. Tambahkan autosave draft, indikator, retry, CAS version, perlindungan perubahan belum tersimpan, dan pemulihan draft lokal per admin/halaman.
5. Batasi varian visual agar konsisten dengan situs utama.

Selesai jika admin bisa menyusun landing lengkap dari draft, membuka kembali hasil simpan, dan mengatasi konflik tanpa kehilangan perubahan. Publik belum berubah.

### Fase 3 — renderer utama dan preview

1. Implementasikan renderer bersama, loader snapshot publik, serta data dinamis kelas/ujian/artikel.
2. Ganti JSX landing di proyek utama dengan renderer dan default dokumen.
3. Buat preview draft pada proyek utama dengan tiket singkat, sekali pakai, yang ditukar server menjadi sesi preview; draft tidak disisipkan ke URL. Preview no-store/noindex dan hanya dapat dibuat admin. Preview menggunakan CSS, navbar/footer, dan komponen situs utama.
4. Tambahkan tampilan desktop/mobile, loading, empty state, dan penanganan blok/schema tidak dikenal.

Selesai jika preview sesuai situs utama, URL preview tidak membuka draft secara publik, dan situs tetap menampilkan snapshot publik saat draft berubah.

### Fase 4 — publikasi, riwayat, dan sinkronisasi

1. Validasi seluruh dokumen saat publikasi: isi wajib, URL aman, media, batas data, ID blok unik, SEO, dan referensi konten publik.
2. Publish atomik melalui RPC dengan role admin dan expected version.
3. Simpan revisi, tampilkan riwayat dan ringkasan perubahan, restore revisi menjadi draft.
4. Implementasikan revalidasi lintas aplikasi, retry, status sinkronisasi, dan pencegahan publikasi ganda saat request diulang.
5. Metadata SEO, gambar share, dan canonical mengikuti snapshot terbit; canonical tetap domain situs utama.

Selesai jika publikasi mengubah situs utama tanpa deploy kode, draft tetap terpisah, rollback melalui revisi berjalan, dan kegagalan revalidasi tidak dilaporkan sebagai kegagalan penyimpanan.

### Fase 5 — penyempurnaan dan kesiapan produksi

1. Audit mobile, keyboard, fokus panel, drag-and-drop dengan alternatif tombol, serta pembacaan screen reader.
2. Optimalkan gambar, fetch data, cache, dan jumlah blok/ukuran dokumen; pastikan satu H1 dan hierarki heading.
3. Uji akses admin/non-admin di UI, server, RLS/RPC; uji XSS, URL berbahaya, akses preview, konflik, restore, publish berulang, dan kegagalan revalidasi.
4. Verifikasi build kedua proyek dalam struktur deployment monorepo yang sama dengan Vercel.
5. Jalankan SQL, pasang konfigurasi server untuk revalidasi/preview, deploy kedua proyek, lalu smoke test draft → preview → publish → restore pada konten yang terkontrol.

Selesai jika draft tetap privat, non-admin ditolak pada seluruh jalur, preview dan publik konsisten, serta publikasi dapat dipulihkan tanpa kehilangan riwayat.

## Urutan rilis dan pengembangan lanjutan

MVP operasional tersedia setelah fase 1–4; fase 5 diselesaikan sebelum rilis produksi. Deploy renderer utama yang kompatibel lebih dahulu, baru editor yang menerbitkan schema tersebut. Jangan menerbitkan tipe blok baru sebelum renderer produksi mendukungnya.

Sesudah MVP: template bagian, jadwal publikasi dalam WIB, pustaka blok reusable, beberapa landing page, eksperimen CTA, dan multibahasa. Fitur ini tidak menjadi ketergantungan MVP.
