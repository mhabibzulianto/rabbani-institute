import { validateLandingDocument } from "./schema.mjs";

export function validateLandingPublication(value) {
  const document = validateLandingDocument(value);
  const active = document.blocks.filter((b) => b.enabled);
  const required = (value, label) => { if (typeof value !== "string" || !value.trim()) throw new Error(`${label} wajib diisi sebelum terbit.`); };
  required(document.seo.title, "Judul SEO"); required(document.seo.description, "Deskripsi SEO");
  if (document.seo.image?.startsWith("#")) throw new Error("Gambar SEO harus mengarah ke file gambar.");
  if (active.filter((b) => b.type === "hero").length !== 1) throw new Error("Gunakan tepat satu blok Hero aktif sebelum terbit.");
  const richText = (node) => [node.type === "text" ? node.text || "" : "", ...(node.content || []).map(richText)].join(" ");
  for (const b of active) {
    const p = b.props;
    if (b.type !== "text") required(p.title, `Judul blok ${b.id}`);
    for (const button of p.buttons || []) { required(button.label, `Label tombol ${b.id}`); required(button.href, `Tujuan tombol ${b.id}`); }
    if (b.type === "imageText") required(p.image?.src, `Gambar ${b.id}`);
    if (p.image?.src?.startsWith("#")) throw new Error(`Gambar ${b.id} harus mengarah ke file gambar.`);
    if (["text", "imageText"].includes(b.type)) required(richText(p.content), `Isi teks ${b.id}`);
    if (p.source === "selected" && !p.selectedIds.length) throw new Error(`Pilih setidaknya satu konten untuk blok ${b.id}.`);
    if (b.type === "features") for (const item of p.items) { required(item.title, "Judul fitur"); required(item.description, "Deskripsi fitur"); }
    if (b.type === "faq") for (const item of p.items) { required(item.question, "Pertanyaan FAQ"); required(item.answer, "Jawaban FAQ"); }
  }
  return document;
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  return value;
}
export function landingChanges(before, after) {
  const old = new Map(before.blocks.map((b) => [b.id, b]));
  const next = new Map(after.blocks.map((b) => [b.id, b]));
  return {
    added: after.blocks.filter((b) => !old.has(b.id)).map((b) => b.props.title || b.id),
    removed: before.blocks.filter((b) => !next.has(b.id)).map((b) => b.props.title || b.id),
    changed: after.blocks.filter((b) => old.has(b.id) && JSON.stringify(stable(old.get(b.id))) !== JSON.stringify(stable(b))).map((b) => b.props.title || b.id),
    reordered: before.blocks.map((b) => b.id).filter((id) => next.has(id)).join(",") !== after.blocks.map((b) => b.id).filter((id) => old.has(id)).join(","),
    seo: JSON.stringify(stable(before.seo)) !== JSON.stringify(stable(after.seo)),
  };
}
export function landingMetadata(document, origin = "https://www.rabbaniinstitute.id") {
  const canonical = new URL("/", origin).toString();
  const image = document.seo.image ? new URL(document.seo.image, canonical).toString() : new URL("/images/rabbani-hero.jpg", canonical).toString();
  return { title: { absolute: document.seo.title }, description: document.seo.description, alternates: { canonical }, openGraph: { title: document.seo.title, description: document.seo.description, url: canonical, images: [{ url: image }] }, twitter: { card: "summary_large_image", title: document.seo.title, description: document.seo.description, images: [image] } };
}
