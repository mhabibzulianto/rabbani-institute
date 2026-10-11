import { landingSchema, validateLandingDocument } from "./landing-document.mjs";

export const BLOCK_LABELS = { hero: "Hero", text: "Teks", features: "Fitur", imageText: "Gambar + teks", courses: "Kelas", exams: "Ujian", articles: "Artikel", cta: "Ajakan / CTA", faq: "FAQ" };
export const FIELD_LABELS = { label: "Label bagian", title: "Judul", description: "Deskripsi", buttons: "Tombol", href: "Tujuan tautan", image: "Gambar", src: "URL gambar", alt: "Alt text (opsional)", caption: "Caption", imagePosition: "Posisi gambar", variant: "Tampilan", content: "Isi teks", items: "Daftar item", icon: "Ikon", systemValue: "Nilai dinamis", source: "Sumber konten", limit: "Jumlah tampil", selectedIds: "ID konten pilihan", catalogUrl: "Tautan katalog", catalogLabel: "Label katalog", emptyMessage: "Pesan jika kosong", question: "Pertanyaan", answer: "Jawaban", seo: "Metadata halaman" };
export const OPTION_LABELS = { latest: "Terbaru", selected: "Pilihan manual", left: "Kiri", right: "Kanan", default: "Standar", soft: "Latar lembut", dark: "Latar gelap", book: "Buku", graduation: "Pendidikan", shield: "Perisai", sparkles: "Bintang", check: "Centang", "payment-status": "Status pembayaran / SSO" };
export function resolveField(spec) { return spec.ref ? landingSchema.definitions[spec.ref] : spec; }
export function initialField(spec) {
  if (spec.ref === "richDoc") return { type: "doc", content: [{ type: "paragraph" }] };
  const field = resolveField(spec);
  if (field.enum) return field.enum[0];
  if (field.type === "string") return "";
  if (field.type === "integer") return field.min || 1;
  if (field.type === "array") return Array.from({ length: field.min || 0 }, () => initialField(field.items));
  if (field.type === "object") return Object.fromEntries((field.required || []).map((key) => [key, initialField(field.properties[key])]));
  return false;
}
export function createLandingBlock(type, id) {
  if (!Object.hasOwn(landingSchema.blocks, type)) throw new Error("Jenis blok tidak dikenal.");
  const props = initialField(landingSchema.blocks[type]);
  if ("title" in props) props.title = `${BLOCK_LABELS[type]} baru`;
  if ("source" in props) props.limit = 3;
  return { id, type, enabled: true, props };
}
export function moveLandingBlock(document, id, destination) {
  const blocks = [...document.blocks];
  const from = blocks.findIndex((block) => block.id === id);
  if (from < 0 || destination < 0 || destination >= blocks.length) return document;
  const [block] = blocks.splice(from, 1); blocks.splice(destination, 0, block);
  return { ...document, blocks };
}
export function normalizeLandingRichText(node) {
  const result = { type: node.type };
  if (node.text !== undefined) result.text = node.text;
  if (node.type === "heading") result.attrs = { level: node.attrs.level };
  if (node.type === "orderedList") result.attrs = { start: node.attrs?.start || 1 };
  if (node.content) result.content = node.content.map(normalizeLandingRichText);
  if (node.marks?.length) result.marks = node.marks.map((mark) => mark.type === "link" ? { type: "link", attrs: { href: mark.attrs.href } } : { type: mark.type });
  return result;
}

export function landingSaveAcknowledgement(data, expectedVersion) {
  const row = Array.isArray(data) && data.length === 1 ? data[0] : data;
  if (!row || !Number.isSafeInteger(row.draft_version) || row.draft_version !== expectedVersion + 1) {
    return { ok: false, conflict: true, error: "Hasil penyimpanan belum dapat dipastikan. Unduh draft dan muat versi server terbaru." };
  }
  return { ok: true, version: row.draft_version, updatedAt: row.updated_at };
}

// Serialize requests and advance CAS only for acknowledged snapshots. Edits made
// during a request are saved next, never marked saved by an older response.
export function createLandingSaveQueue({ document, version, save, onChange = () => {} }) {
  let latest = document, saved = JSON.stringify(document), currentVersion = version;
  let running = null, conflict = false, error = "";
  const dirty = () => JSON.stringify(latest) !== saved;
  const notify = (state) => onChange({ state, version: currentVersion, dirty: dirty(), error, conflict });
  return {
    update(next) { latest = next; notify(conflict ? "conflict" : dirty() ? "dirty" : "saved"); },
    get dirty() { return dirty(); },
    get version() { return currentVersion; },
    get document() { return latest; },
    async flush() {
      if (running) return running;
      if (conflict) return false;
      running = (async () => {
        while (dirty()) {
          let snapshot;
          try { snapshot = validateLandingDocument(latest); }
          catch (problem) { error = problem.message; notify("error"); return false; }
          error = ""; notify("saving");
          let result;
          try { result = await save({ version: currentVersion, document: snapshot }); }
          catch { result = { ok: false, error: "Koneksi terputus. Draft lokal tetap tersedia." }; }
          if (!result?.ok) { error = result?.error || "Gagal menyimpan draft."; conflict = Boolean(result?.conflict); notify(conflict ? "conflict" : "error"); return false; }
          currentVersion = result.version; saved = JSON.stringify(snapshot);
        }
        error = ""; notify("saved"); return true;
      })();
      try { return await running; } finally { running = null; }
    },
  };
}
