import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canReviewArticles } from "@/lib/access.mjs";
import { calendarEvents, monthWindow, reportMonth, jakartaDay } from "./report-calendar.mjs";

// Read bounded pages rather than silently accepting PostgREST's default row cap.
async function readRows(makeQuery) {
  const rows = [];
  for (let page = 0; page < 10; page++) {
    const result = await makeQuery().range(page * 500, page * 500 + 499);
    if (result.error) return { rows: [], error: true };
    rows.push(...(result.data || []));
    if (!result.data || result.data.length < 500) return { rows, error: false, limited: false };
  }
  return { rows, limited: true, error: false };
}
export async function getReportCalendar(value) {
  const { user, profile } = await requireEditorialUser();
  const admin = canReviewArticles(profile), month = reportMonth(value), window = monthWindow(month);
  const supabase = await createSupabaseServerClient();
  const columns = "id,title,status,author_id,published_at,scheduled_at,publication_error,author:profiles!articles_author_id_fkey(full_name)";
  const scoped = (query, embedded = false) => admin ? query : query.eq(embedded ? "article.author_id" : "author_id", user.id);
  const [revisions, publications, schedules] = await Promise.all([
    readRows(() => scoped(supabase.from("article_revisions").select("id,reason,created_at,title:metadata_json->>title,article:articles!inner(id,title,status,author_id,author:profiles!articles_author_id_fkey(full_name))").in("reason", ["published", "submitted"]).gte("created_at", window.from).lt("created_at", window.until), true).order("created_at").order("id")),
    readRows(() => scoped(supabase.from("articles").select(columns).gte("published_at", window.from).lt("published_at", window.until)).order("published_at").order("id")),
    readRows(() => scoped(supabase.from("articles").select(columns).eq("status", "submitted").gte("scheduled_at", window.from).lt("scheduled_at", window.until)).order("scheduled_at").order("id")),
  ]);
  const notices = [];
  if (revisions.error) notices.push("Riwayat pengajuan dan publikasi belum dapat dimuat. Laporan publikasi memakai tanggal terbit yang tersedia.");
  if (publications.error || schedules.error) notices.push("Sebagian data artikel belum dapat dimuat. Coba muat ulang laporan.");
  if ([revisions, publications, schedules].some(result => result.limited)) notices.push("Bulan ini memuat lebih dari batas 5.000 catatan per jenis data. Laporan yang ditampilkan belum lengkap.");
  return { month, today: jakartaDay(new Date()), admin, events: calendarEvents({ revisions: revisions.rows, publications: publications.rows, schedules: schedules.rows }, month), notices };
}
