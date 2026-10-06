export const REVISION_REASONS = { before_restore: "Sebelum pemulihan", restored: "Revisi dipulihkan", created: "Draft dibuat", baseline: "Versi awal", manual: "Snapshot manual", autosave: "Snapshot otomatis", submitted: "Diajukan", draft: "Kembali ke draft", rejected: "Perlu revisi", published: "Diterbitkan", archived: "Diarsipkan", scheduled: "Dijadwalkan", schedule_cancelled: "Jadwal dibatalkan", review_note: "Catatan redaksi", publication_failed: "Publikasi gagal" };
export function workflowActions(admin, status) {
  if (!admin) return status === "draft" ? [{ status: "submitted", label: "Ajukan untuk review" }] : status === "rejected" ? [{ status: "draft", label: "Kembali ke draft" }] : [];
  return ({ draft: [{ status: "submitted", label: "Ajukan untuk review" }], submitted: [{ status: "draft", label: "Kembalikan ke draft" }, { status: "rejected", label: "Minta revisi" }, { status: "published", label: "Terbitkan sekarang" }], published: [{ status: "archived", label: "Arsipkan / unpublish" }], archived: [{ status: "draft", label: "Kembalikan ke draft" }], rejected: [{ status: "draft", label: "Kembali ke draft" }] })[status] || [];
}
export function validateReviewInput(input) {
  if (!input || !["draft", "rejected", "published", "archived", "submitted"].includes(input.status)) throw new Error("Perubahan status tidak valid.");
  if (typeof input.note !== "string" || input.note.length > 4000) throw new Error("Catatan redaksi maksimal 4.000 karakter.");
  const note = input.note.trim();
  if (input.status === "rejected" && note.length < 3) throw new Error("Isi alasan revisi agar penulis tahu apa yang perlu diperbaiki.");
  return { status: input.status, note };
}
export function hasPublicationText(doc) {
  return Boolean(doc?.type === "text" && typeof doc.text === "string" && doc.text.trim()) || Boolean(doc?.content?.some(hasPublicationText));
}
export function scheduleFromJakarta(value, now = new Date()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Pilih tanggal dan waktu publikasi.");
  const date = new Date(`${value}:00+07:00`);
  const maximum = new Date(now);
  maximum.setUTCDate(1);
  maximum.setUTCFullYear(now.getUTCFullYear()+1);
  const lastDay = new Date(Date.UTC(maximum.getUTCFullYear(),maximum.getUTCMonth()+1,0)).getUTCDate();
  maximum.setUTCDate(Math.min(now.getUTCDate(),lastDay));
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 25200000).toISOString().slice(0,16) !== value || date <= now || date > maximum) throw new Error("Pilih waktu mendatang, maksimal satu tahun (zona waktu Jakarta).");
  return date.toISOString();
}
export function formatPublicationTime(value) {
  return value ? new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) + " (Jakarta)" : "";
}
