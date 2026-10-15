import { isSafeLandingUrl } from "./schema.mjs";

// Adapt previous built-in copy without replacing custom editorial text or
// modifying stored drafts and immutable publication history.
const legacyCopy = new Map([
  ["SSO siap", "Satu akun untuk belajar"],
  ["Pintu masuk akun bersama Rabbani siap dipakai saat dibutuhkan.", "Gunakan akun Rabbani yang sama untuk mengakses kelas dan mengelola kegiatan belajar Anda."],
  ["Pilih kelas, daftar, lalu simpan progress belajar langsung di Supabase.", "Pilih kelas, mulai belajar, dan lanjutkan dari progres terakhir Anda."],
  ["Modul ujian", "Ujian"],
  ["Akses ujian mandiri dan ujian susulan dengan OTP WhatsApp, timer, dan batas attempt yang sudah diatur.", "Ikuti ujian mandiri dan ujian susulan dengan kode verifikasi melalui WhatsApp. Durasi dan jumlah kesempatan tercantum pada setiap ujian."],
  ["Belum ada modul ujian yang dibuka saat ini.", "Belum ada ujian yang dibuka saat ini."],
  ["Buka halaman artikel", "Lihat semua artikel"],
  ["Bergabunglah dengan ribuan pelajar lainnya dan mulai perjalanan Anda dalam memahami kitab suci dengan lebih baik.", "Mulai perjalanan belajar Anda dengan kelas yang sesuai dengan kebutuhan dan tingkat pemahaman Anda."],
]);

export function publicLandingText(text) {
  return legacyCopy.get(text) || text;
}

export function publicArticleCatalogUrl(value, destination = "https://www.rabbaniinstitute.id/artikel") {
  if (!value || !isSafeLandingUrl(value)) return value;
  try {
    const url = new URL(value, "https://www.rabbaniinstitute.id");
    if (["editorial.rabbaniinstitute.id", "www.rabbaniinstitute.id", "rabbaniinstitute.id"].includes(url.hostname)
      && url.protocol === "https:" && !url.port && /^\/artikel\/?$/.test(url.pathname)) {
      return `${destination}${url.search}${url.hash}`;
    }
  } catch { /* Preserve unrelated destinations. */ }
  return value;
}

export function preparePublicLandingDocument(document, articleCatalogUrl) {
  const result = structuredClone(document);
  for (const block of result.blocks) {
    const props = block.props;
    for (const key of ["label", "title", "description", "catalogLabel", "emptyMessage"]) {
      if (typeof props[key] === "string") props[key] = publicLandingText(props[key]);
    }
    if (block.type === "features") {
      for (const item of props.items) {
        item.title = publicLandingText(item.title);
        item.description = publicLandingText(item.description);
      }
    }
    if (block.type === "articles" && Object.hasOwn(props, "catalogUrl")) {
      props.catalogUrl = publicArticleCatalogUrl(props.catalogUrl, articleCatalogUrl);
    }
  }
  return result;
}
