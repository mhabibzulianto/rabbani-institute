const block = (id, type, props) => ({ id, type, enabled: true, props });
const catalog = (label, title, description, extra = {}) => ({ label, title, description, source: "latest", limit: 3, selectedIds: [], ...extra });

// Preserve today's home sections. URLs are explicit so Editorial's origin is
// never used accidentally. Runtime payment text remains a data-driven feature.
const document = {
  schemaVersion: 1,
  seo: { title: "Rabbani Institute", description: "Platform belajar Al-Qur'an, Bahasa Arab, dan keislaman." },
  blocks: [
    block("beranda", "hero", { label: "Platform belajar online", title: "Al-Qur'an dan Bahasa Arab", description: "Rabbani Institute menghadirkan kelas keislaman, Bahasa Arab, dan kajian bertahap dalam satu ruang belajar yang rapi, tenang, dan mudah diikuti dari mana saja.", buttons: [{ label: "Mulai belajar", href: "https://madrasah.rabbaniinstitute.id/kelas" }], variant: "default" }),
    block("tentang", "features", { label: "Tentang platform", title: "Ekosistem belajar yang terasa tenang dan fokus", description: "Kurikulum, evaluasi, dan bahan pendukungnya kami rapikan supaya peserta tinggal belajar dengan lebih nyaman.", items: [
      { icon: "book", title: "2 kategori utama", description: "Bahasa Arab dan Ulumul Qur'an kami susun sebagai fondasi perjalanan belajar awal." },
      { icon: "graduation", title: "2 model kelas", description: "Kelas Mandiri dan Kelas Madrasah berjalan berdampingan tanpa memecah pengalaman peserta." },
      { icon: "shield", title: "SSO siap", description: "Pintu masuk akun bersama Rabbani siap dipakai saat dibutuhkan.", systemValue: "payment-status" },
    ] }),
    block("kelas", "courses", catalog("Katalog kelas", "Kelas unggulan", "Pilih kelas, daftar, lalu simpan progress belajar langsung di Supabase.", { catalogUrl: "https://madrasah.rabbaniinstitute.id/kelas", catalogLabel: "Lihat semua kelas" })),
    block("ujian", "exams", catalog("Modul ujian", "Ujian yang tersedia", "Akses ujian mandiri dan ujian susulan dengan OTP WhatsApp, timer, dan batas attempt yang sudah diatur.", { catalogUrl: "/exams", catalogLabel: "Lihat semua ujian", emptyMessage: "Belum ada modul ujian yang dibuka saat ini." })),
    block("artikel", "articles", catalog("Artikel", "Tulisan terbaru", "Baca penjelasan, kutipan Arab, dan catatan pembelajaran yang melengkapi kelas-kelas di Rabbani Institute.", { catalogUrl: "https://editorial.rabbaniinstitute.id/artikel", catalogLabel: "Buka halaman artikel", emptyMessage: "Belum ada artikel yang terbit saat ini." })),
    block("mulai", "cta", { label: "Mulai perjalanan Anda", title: "Siap memperdalam pemahaman Al-Qur'an dan Bahasa Arab?", description: "Bergabunglah dengan ribuan pelajar lainnya dan mulai perjalanan Anda dalam memahami kitab suci dengan lebih baik.", variant: "default", buttons: [{ label: "Pilih kelas", href: "https://madrasah.rabbaniinstitute.id/kelas" }, { label: "Hubungi kami", href: "/kontak" }] }),
  ],
};

export function createDefaultLandingDocument() {
  return JSON.parse(JSON.stringify(document));
}
