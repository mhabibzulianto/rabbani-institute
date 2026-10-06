# Editorial Rabbani Institute

Dashboard penulis dan administrator, menggunakan Next.js dan project Supabase
yang sama dengan aplikasi utama Rabbani Institute.

## Menjalankan lokal

Gunakan Node.js 20.9+ dan pnpm. Salin `.env.example` ke `.env.local`, lalu isi
`NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dengan project yang
sama seperti aplikasi induk. Jangan gunakan service-role key di aplikasi ini.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Aplikasi tersedia di http://localhost:3001. Untuk localhost, kosongkan
`NEXT_PUBLIC_RABBANI_COOKIE_DOMAIN`. Pada produksi, set domain cookie ke
`.rabbaniinstitute.id` dan site URL ke `https://editorial.rabbaniinstitute.id`.

Untuk melihat UI sebelum patch SQL diterapkan, tambahkan
`EDITORIAL_LOCAL_PREVIEW=true` ke environment server development. Mode ini hanya
melewati pencatatan membership; login dan pemeriksaan izin tetap aktif. Mode ini
tidak berlaku pada production dan tidak mensimulasikan RLS database baru.

## Fondasi database (fase 1)

Prerequisite: `schema.sql`, `articles_patch.sql`, `account_center_patch.sql`, dan
`madrasah_app_patch.sql` dari direktori `../supabase` sudah diterapkan.
Setelah itu jalankan `../supabase/editorial_foundation_patch.sql` melalui
Supabase SQL Editor. Patch bersifat transaksional dan dapat dijalankan ulang.
File SQL dalam repository tidak otomatis diterapkan ke database produksi.

Akses dashboard dan mutation memerlukan profile dengan `role = admin`,
`role = instructor`, atau `is_writer = true`. Hanya admin yang dapat melakukan
review, mengembalikan draft yang diajukan, menolak, menerbitkan, dan mengarsipkan.
Membership app merupakan catatan aktivitas, bukan sumber pemberian izin.
Untuk memberi izin penulis, admin memakai RPC `admin_set_writer_access` yang
sudah tersedia; pengguna tidak dapat mengubah `is_writer` melalui form profil.

### Penyimpanan konten

`content_json` merupakan format dokumen Tiptap (`type: doc`, `content: []`),
dengan `content_schema_version = 1`. Kolom `version` naik pada setiap update dan
`last_saved_at` diisi database. Autosave fase 3 wajib memakai filter
`id = articleId AND version = expectedVersion`, lalu membaca versi hasil update.
Hasil nol baris berarti konflik atau tidak memiliki akses; jangan retry dengan
menimpa data terbaru.

`blocks` dan `content_raw` tetap dipertahankan karena aplikasi induk memakai
Plate/Gutenberg. `content_json = NULL` menunjukkan konten legacy yang belum
dikonversi. Konversi rich text/media/catatan kaki dilakukan ketika membangun
adapter editor pada fase 3. Pada penyimpanan pertama, source legacy disalin ke
`content_legacy_backup`; `blocks` dan `content_raw` kemudian diperbarui ke format
Gutenberg yang tetap dapat dibaca aplikasi induk. Jangan mengubah `content_raw` menjadi plain text sampai pembaca aplikasi
induk juga diperbarui. Saat editor lama mengubah konten, database mengosongkan
cache Tiptap yang sudah usang agar tidak menampilkan dokumen versi lama.

### Workflow

Semua artikel baru dimulai sebagai `draft`.

| Dari | Ke | Pelaku |
| --- | --- | --- |
| draft | submitted | Penulis pemilik / admin |
| submitted | draft / rejected / published | Admin |
| rejected | draft | Penulis pemilik / admin |
| published | archived | Admin |
| archived | draft | Admin |

Penulis hanya mengedit artikelnya dalam status draft/rejected. Submitted,
published, dan archived terkunci bagi penulis. Hanya draft yang dapat dihapus.
RPC `transition_editorial_article` memerlukan `target_article_id`,
`expected_version`, `target_status`, dan `review_note` opsional. RLS dan trigger
tetap memeriksa izin jika klien menulis langsung melalui REST. Admin juga harus
mengikuti urutan status. Service-role hanya untuk proses backend tepercaya.

**Dampak pada aplikasi induk:** editor Plate lama harus menyimpan draft sebelum
mengajukan artikel. Endpoint yang langsung membuat artikel submitted/published
atau mengedit artikel yang sedang direview akan ditolak. Perbarui pemanggilnya
ke RPC workflow sebelum merilis patch ke project Supabase bersama.

## Verifikasi

```sh
pnpm test
pnpm lint
pnpm build
```

## Daftar artikel (fase 2)

`/artikel` memuat judul, status, penulis, kategori dan tanggal perubahan. Filter
judul/status/penulis/kategori/tanggal pembuatan tersimpan dalam URL, dengan
pagination 20 artikel per halaman dan urutan updated_at/id terbaru. Tanggal
memakai zona waktu Jakarta (UTC+7). Penulis/instructor hanya melihat artikel
miliknya, sementara admin melihat semua artikel yang diizinkan RLS.

`/artikel/baru` membuat draft dengan judul/ringkasan lalu membuka editor dedicated. Penulis dan status selalu
ditentukan server, slug unik dibentuk dengan UUID. `/artikel/[id]` menampilkan
preview melalui parameter `preview` pada halaman daftar: sidebar dari kanan
menampilkan metadata di atas dan isi artikel di bawah, sementara daftar tetap
terlihat di belakang. Panel langsung terbuka saat klik, menampilkan skeleton
sebelum konten selesai dimuat melalui streaming Suspense. Pada mobile panel
memenuhi layar. Link `/artikel/[id]`
diarahkan ke preview ini, dengan pemeriksaan pemilik/admin di server. Tombol
tutup, klik luar panel, dan Escape menutup preview sambil mempertahankan filter
dan posisi daftar. HTML preview
disanitasi di server; format Tiptap, Plate, Gutenberg dan legacy dibaca tanpa
mengubah source. Menu memakai Next Link dan filter memakai Next Form untuk
navigasi client-side dengan layout dashboard yang tetap terpasang.

Halaman editor Tiptap berada pada `app/(editor)/artikel/[id]/edit/page.js`,
dengan layout autentikasi mandiri yang tidak memasang AppShell. Jangan menaruh
halaman editor di route group `(dashboard)`. Daftar dan draft memakai kolom legacy yang sudah tersedia sehingga bisa
diuji pada mode preview lokal sebelum patch fondasi diterapkan. Membuat draft
tetap menulis ke Supabase yang dikonfigurasi; preview bukan database mock.

Test memakai PostgreSQL sementara dalam PGlite untuk menjalankan patch SQL,
RLS, trigger, konflik versi, dan transisi dengan role yang berbeda. Test tidak
menghubungi Supabase atau mengubah data pengguna. Build memerlukan environment
Supabase yang valid. Test filter juga memeriksa parameter URL, batas tanggal,
wildcard pencarian literal, dan scope penulis. Test preview memeriksa format
konten, sanitasi HTML, catatan kaki, dan URL tombol tutup.

## Editor Tiptap MVP (fase 3)

`/artikel/[id]/edit` memakai header Dashboard/brand/Publish, toolbar sticky,
kanvas dokumen, serta footer jumlah kata, karakter, estimasi waktu baca, dan
status penyimpanan. Toolbar mendukung heading, bold/italic/underline/strike,
kode inline, link, bullet/numbered list, kutipan, garis pemisah, alignment,
undo/redo, dan unduhan JSON. Metadata judul, ringkasan, kategori, topik, dan tag
dapat diubah. Buka editor melalui tombol pada preview atau setelah membuat draft.

Autosave berjalan 1,2 detik setelah perubahan terakhir dan dapat dipicu dengan
tombol Simpan atau Ctrl/Cmd+S. Request diserialkan, memakai version/status yang
diharapkan, memeriksa pemilik/role di server, dan tidak menimpa hasil konflik.
Salinan lokal dipisahkan per pengguna/artikel, ditawarkan untuk dipulihkan saat
membuka ulang, dan dihapus setelah berhasil tersimpan ke server. Salinan lokal
tidak disinkronkan antar perangkat; unduhan JSON membantu menyimpan cadangan.

Jalankan kembali **patch fondasi terbaru** untuk menambahkan `content_raw` pada
schema lama serta `content_legacy_backup`. Jika kolom editor belum tersedia,
editor dapat dicoba lokal, tetapi Simpan/Publish ke server dinonaktifkan. Patch
tetap tidak dijalankan otomatis. Konversi Plate/basic Gutenberg menjaga teks,
format dasar, dan daftar. Tabel, kolom khusus, serta catatan kaki yang
belum didukung MVP ditampilkan read-only agar tidak hilang saat menyimpan.

Publish meminta konfirmasi di halaman editor, menyimpan perubahan terlebih
dahulu, lalu menggunakan RPC workflow. Penulis mengajukan artikel untuk review;
admin menerbitkan melalui transisi submitted → published. Jika proses multi
transisi berhenti, editor menampilkan status terakhir yang berhasil. Artikel
submitted/published/archived terkunci bagi penulis; admin dapat mengedit selain
archived. Kontrol review lengkap dijelaskan pada fase 5 di bawah.

## Media dan kategori (fase 4)

Dropdown kategori menyediakan **Tambah kategori baru**. Dialog memvalidasi
nama 2–120 karakter, memakai kategori aktif yang namanya sama (tanpa membedakan
huruf besar/kecil), lalu langsung memilih hasilnya. RPC hanya mengizinkan akun
editorial membuat kategori bersama; hak mengubah kategori lama tidak diperluas.

Jalankan `../supabase/editorial_media_patch.sql` **setelah patch fondasi terbaru**.
Patch tidak dijalankan otomatis. Patch membuat tabel media dengan RLS, bucket
`editorial-media`, serta RPC kategori. Admin melihat seluruh pustaka; penulis
lain hanya melihat unggahannya sendiri. Bucket publik karena URL digunakan
oleh artikel terbit: siapa pun yang memiliki tautan dapat membaca file,
termasuk file yang belum dipakai di artikel terbit. Metadata pustaka tetap privat.

`/media` menyediakan upload, pencarian nama, filter jenis, pagination, dan
detail/URL file. Di toolbar editor, tombol media membuka pilihan dari pustaka,
upload baru, atau URL. Mendukung gambar JPG/PNG/WebP/GIF (10 MB), video MP4/WebM,
audio MP3/OGG/WAV, serta PDF (50 MB). Alt text dan caption opsional, maksimal
500 karakter. Blok terpilih dapat diubah melalui tombol media yang sama;
Undo/Redo juga berlaku pada penyisipan dan perubahan media. Cover dipilih
melalui **Tambahkan cover**, hanya menerima gambar, dan ikut autosave artikel.

Upload menggunakan route Node `/api/editorial/media/upload`, memeriksa origin,
session/role, ukuran, MIME, dan signature file sebelum menulis memakai client
Supabase pengguna (tanpa service role). File tidak ditimpa. Jika pencatatan
metadata gagal setelah upload, file yang belum tercatat dibersihkan. Route ini
memuat satu file di memori (batas request 51 MB); sesuaikan batas upload reverse
proxy/hosting sebelum deployment. Validasi signature bukan pemindai malware.
Tidak ada penghapusan file tercatat di UI sehingga tautan artikel tetap utuh.

Dokumen dengan media diserialkan juga ke Plate untuk kompatibilitas renderer
situs utama; caption, teks, format dasar, penomoran list dan garis pemisah
dipertahankan. Dokumen tanpa media tetap memakai adaptor Gutenberg. Source
legacy pertama tetap dicadangkan oleh fondasi. Sebelum patch, URL media dan
cover bisa dicoba secara lokal serta diunduh bersama salinan JSON; upload,
penambahan kategori, Simpan dan Publish membutuhkan schema yang sesuai.

Test media memakai PostgreSQL sementara untuk menguji patch dua kali, RLS
pustaka/storage, akses kategori, duplikasi nama dan alt kosong. Test dokumen
memeriksa konversi media dan URL berbahaya; test upload memeriksa signature,
format dan batas ukuran. Test tidak mengunggah file ke Supabase live.

## Preview dan workflow (fase 5)

Tombol **Preview** membuka tampilan publik layar penuh dari tulisan saat ini,
termasuk perubahan yang belum tersimpan. Request memvalidasi dan menyanitasi
JSON di server, tanpa menyimpan atau menerbitkan artikel. Ukuran heading,
font stack, jarak paragraf/daftar, dan kutipan mengikuti reader situs utama.
`/artikel/[id]/preview` menampilkan versi tersimpan, memakai pemeriksaan
pemilik/admin, dan diberi `noindex`. Preview tidak membuka akses publik ke draft.
Blok legacy khusus tetap dapat dipreview tanpa konversi yang merusak source.

Panel **Status, review, dan revisi** menyediakan:

- Admin: simpan catatan redaksi, kembalikan artikel diajukan ke draft, minta
  revisi dengan alasan wajib (3–4.000 karakter), terbitkan, dan arsip/unpublish.
- Penulis: mengajukan melalui Publish dan mengembalikan artikel yang perlu
  revisi ke draft untuk diperbaiki. Catatan redaksi tampil bagi pemilik.
- Admin: jadwal publikasi Jakarta (UTC+7), ubah jadwal, dan batalkan jadwal.
- Riwayat snapshot dengan preview versi sebelumnya serta snapshot manual.

Mutation menyimpan perubahan editor dahulu, memakai versi terakhir, memeriksa
role/ownership di server, serta menjalankan RLS dan trigger. Arsip menghilangkan
artikel dari pembaca publik; kembali ke draft mengosongkan tanggal terbit.
Submitted/published/archived tetap terkunci bagi penulis.

Jalankan `../supabase/editorial_workflow_patch.sql` setelah patch fondasi dan
media. Patch menambahkan jadwal/error publikasi, snapshot immutable dengan RLS,
RPC penjadwalan, dan worker publikasi. SQL tidak dijalankan otomatis oleh aplikasi.
Sebelum patch, Preview tetap bisa dicoba; review, Publish, jadwal dan snapshot
server dinonaktifkan/menampilkan keterangan.

Snapshot dibuat pada perubahan status, catatan redaksi, jadwal, snapshot manual,
dan penyimpanan berkala (minimal lima menit sejak snapshot terakhir). Source
legacy pertama disimpan sebagai baseline sebelum perubahan pertamanya. Snapshot
menyimpan JSON/legacy serta metadata saat itu, bukan setiap ketikan. Snapshot
manual tidak menaikkan versi artikel dan idempotent per versi. UI tidak mengubah
atau menghapus snapshot; restore menjadi fase 6.

### Publikasi otomatis

Patch mencoba mengaktifkan Supabase `pg_cron` dan memasang satu job bernama
`editorial-publish-due`, setiap menit, dengan command:

```sql
select public.publish_due_editorial_articles();
```

Jika extension tidak tersedia atau pemasangannya gagal, migration fitur lain
tetap selesai, SQL mengeluarkan warning/notice, dan Jadwalkan dinonaktifkan.
Aktifkan **pg_cron** di Supabase Extensions/Cron lalu jalankan kembali patch
melalui SQL Editor sebagai `postgres`. Periksa job aktif dan riwayat run berhasil
di Supabase Cron. [Panduan resmi](https://supabase.com/docs/guides/cron/install).

Worker memproses maksimal 50 artikel jatuh tempo per run, memakai row lock
`SKIP LOCKED`, menerbitkan dan membuat snapshot dalam transaksi yang sama.
Artikel tetap submitted sampai waktunya tiba. Penjadwalan memerlukan judul
dan dokumen Tiptap berisi teks; worker memeriksa isi lagi sebelum terbit.
Kegagalan ditandai pada artikel dan tidak diulang terus-menerus. Admin memperbaiki
isi dan menjadwalkan ulang. Keterlambatan normal sampai satu menit, lebih lama
jika antrean melebihi batch atau database/job sedang tidak berjalan.

Worker merupakan fungsi privileged untuk Cron/service role, tanpa endpoint
browser. Execute untuk anon/authenticated dicabut; tidak ada service-role key
di aplikasi. Konteks service berlaku selama transaksi worker lalu dikembalikan.
Membuat/mengubah jadwal tetap memerlukan admin dan CAS.

Test fase 5 memakai PGlite untuk migration dua kali, baseline/snapshot immutable,
alasan penolakan, workflow, CAS, pemisahan penulis, batas tanggal, worker yang
idempotent, dan publikasi gagal. Tabel job Cron disimulasikan; extension Cron
dan publikasi live tidak dijalankan oleh test.

## Penyempurnaan editor (fase 6)

- Daftar isi mengikuti heading H2–H4; klik bagian untuk berpindah ke teksnya.
- Ketik `/` pada awal paragraf untuk memilih teks, heading, daftar, kutipan,
  garis pemisah, atau media. Cari perintah, gunakan panah dan Enter; Esc menutup.
- Bubble menu muncul saat teks dipilih: bold, italic, underline, tautan, dan
  hapus format. Implementasi memakai komponen resmi
  [BubbleMenu Tiptap](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu).
- Paste HTML mempertahankan format dasar, heading, daftar, tautan aman, gambar
  ber-URL, dan teks Arab; membuang font, warna, class, script, dan atribut bawaan
  Word/Google Docs. File clipboard diarahkan ke menu Media. Tempelan di atas
  500 KB ditolak; tabel/format khusus belum menjadi blok editor.
- Toolbar mendukung panah kiri/kanan, Home/End, fokus terlihat, dan tombol lebih
  besar di layar sentuh. Ctrl/Cmd+S menyimpan. Menu dibatasi viewport; daftar isi
  mengikuti preferensi reduced motion. Penghitungan kata dan daftar isi hanya
  dihitung ulang saat dokumen berubah.

Jalankan `../supabase/editorial_polish_patch.sql` **setelah patch workflow** untuk
mengaktifkan pemulihan revisi. Patch dapat dijalankan ulang dan tidak mengubah
artikel saat dipasang. Dari Riwayat revisi, lihat revisi lalu pilih Pulihkan dan
konfirmasi. Perubahan lokal disimpan dahulu; RPC memeriksa versi artikel,
mengunci row, menyimpan snapshot `before_restore`, mengganti isi/metadata, lalu
menyimpan snapshot `restored` dalam satu transaksi. Snapshot lama tetap immutable.
Status, penulis, slug, catatan redaksi, dan backup legacy pertama dipertahankan.
Pemulihan hanya pada draft/perlu revisi milik penulis atau oleh admin. Artikel
published/submitted/archived perlu dikembalikan ke draft melalui workflow dahulu.
Jika kategori lama sudah dihapus, transaksi gagal tanpa mengganti artikel.

Pengujian mencakup izin pemulihan, CAS, revisi milik artikel lain, snapshot sebelum
dan setelah pemulihan, serta restore canonical/legacy. Stress test mengedit dan
mengekspor dokumen 1.200 blok/300 heading dengan teks Arab. Pengujian SQL memakai
PGlite sementara; tidak mengubah database Supabase live.
