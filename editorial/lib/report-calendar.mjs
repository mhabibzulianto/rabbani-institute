export const REPORT_TYPES = { published: "Diterbitkan", scheduled: "Dijadwalkan", submitted: "Diajukan" };
const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
export function jakartaDay(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return parts.year + "-" + parts.month + "-" + parts.day;
}
export function reportMonth(value, now = new Date()) {
  return typeof value === "string" && /^(20\d{2}|21\d{2})-(0[1-9]|1[0-2])$/.test(value) ? value : jakartaDay(now).slice(0, 7);
}
export function monthWindow(month) {
  if (reportMonth(month) !== month) throw new Error("Bulan laporan tidak valid.");
  const [year, number] = month.split("-").map(Number);
  const next = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
  return { from: month + "-01T00:00:00+07:00", until: next + "-01T00:00:00+07:00" };
}
export function shiftMonth(month, step) {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + step, 1)).toISOString().slice(0, 7);
}
export function monthCells(month) {
  const [year, number] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, number - 1, 1));
  const offset = (start.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(year, number - 1, index - offset + 1));
    const day = date.toISOString().slice(0, 10);
    return { day, number: date.getUTCDate(), current: day.startsWith(month) };
  });
}
export function selectedReportDay(value, month, today) {
  return typeof value === "string" && monthCells(month).some(cell => cell.current && cell.day === value) ? value : today.startsWith(month) ? today : month + "-01";
}
export function calendarEvents({ revisions = [], publications = [], schedules = [] }, month) {
  const events = [], seen = new Set(), historicalPublished = new Set();
  function add(article, kind, timestamp, key, title) {
    const day = jakartaDay(timestamp);
    if (!article || !day.startsWith(month) || !Object.hasOwn(REPORT_TYPES, kind) || seen.has(key)) return;
    seen.add(key);
    events.push({ id: key, articleId: String(article.id), title: title || article.title || "Artikel tanpa judul", author: article.author?.full_name || "Penulis tanpa nama", status: article.status, kind, timestamp, day, failed: kind === "scheduled" && Boolean(article.publication_error) });
  }
  for (const revision of revisions) {
    const article = Array.isArray(revision.article) ? revision.article[0] : revision.article;
    add(article, revision.reason, revision.created_at, "revision-" + revision.id, revision.title);
    if (article && revision.reason === "published" && jakartaDay(revision.created_at).startsWith(month)) historicalPublished.add(String(article.id));
  }
  for (const article of publications) if (!historicalPublished.has(String(article.id))) add(article, "published", article.published_at, "published-" + article.id);
  for (const article of schedules) if (article.status === "submitted") add(article, "scheduled", article.scheduled_at, "scheduled-" + article.id);
  return events.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp) || a.id.localeCompare(b.id));
}
