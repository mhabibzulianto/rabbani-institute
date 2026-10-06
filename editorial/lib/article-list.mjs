export const ARTICLE_STATUSES = {
  draft: "Draft", submitted: "Diajukan", published: "Terbit", rejected: "Perlu revisi", archived: "Arsip",
};
export const ARTICLE_PAGE_SIZE = 20;

const text = (value) => typeof value === "string" ? value.trim() : "";
const id = (value) => /^[1-9]\d{0,18}$/.test(text(value)) && BigInt(text(value)) <= 9223372036854775807n ? text(value) : "";
function date(value) {
  const candidate = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return "";
  if (candidate < "1900-01-01" || candidate > "9998-12-31") return "";
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : "";
}

export function normalizeArticleFilters(params = {}) {
  const from = date(params.from);
  const until = date(params.until);
  const page = /^\d+$/.test(text(params.page)) ? Number(params.page) : 1;
  return {
    q: text(params.q).slice(0, 120),
    status: Object.hasOwn(ARTICLE_STATUSES, text(params.status)) ? text(params.status) : "",
    author: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text(params.author)) ? text(params.author) : "",
    category: id(params.category),
    from, until: from && until && until < from ? from : until,
    page: Number.isSafeInteger(page) ? Math.min(10000, Math.max(1, page)) : 1,
  };
}

export function articleListHref(filters, changes = {}) {
  const merged = { ...filters, ...changes };
  const params = new URLSearchParams();
  for (const key of ["q", "status", "author", "category", "from", "until", "page"]) {
    if (merged[key] && !(key === "page" && Number(merged[key]) === 1)) params.set(key, String(merged[key]));
  }
  return `/artikel${params.size ? `?${params}` : ""}`;
}

export function applyArticleFilters(query, filters, userId, isAdmin) {
  if (!isAdmin) query = query.eq("author_id", userId);
  else if (filters.author) query = query.eq("author_id", filters.author);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.q) query = query.ilike("title", `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`);
  // Calendar dates and display use the site time zone, Jakarta (UTC+07:00).
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00+07:00`);
  if (filters.until) {
    const nextDay = new Date(`${filters.until}T00:00:00Z`);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    query = query.lt("created_at", `${nextDay.toISOString().slice(0, 10)}T00:00:00+07:00`);
  }
  return query;
}

export function formatArticleDate(value) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date(value));
}
