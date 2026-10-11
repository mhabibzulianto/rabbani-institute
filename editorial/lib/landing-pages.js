import "server-only";
import { requireLandingAdmin } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDefaultLandingDocument, validateLandingDocument } from "@/lib/landing-document.mjs";

export async function getLandingPageForAdmin() {
  await requireLandingAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("landing_pages")
    .select("slug,draft_document,draft_version,updated_at").eq("slug", "home").maybeSingle();
  if (error) {
    if (["42P01", "PGRST205"].includes(error.code)) {
      return { schemaReady: false, document: createDefaultLandingDocument(), version: null };
    }
    throw new Error("Gagal membaca draft landing. Coba lagi.", { cause: error });
  }
  if (!data) throw new Error("Draft awal belum tersedia. Jalankan landing_page_editor_patch.sql.");
  const { data: published, error: publicationError } = await supabase.from("landing_page_publications").select("revision_id,published_at").eq("page_slug", "home").maybeSingle();
  if (publicationError) throw new Error("Gagal membaca status publikasi landing.");
  const syncQuery = supabase.from("landing_publication_sync").select("synced_at,last_error,attempts");
  const { data: sync, error: syncError } = published ? await syncQuery.eq("revision_id", published.revision_id).maybeSingle() : await syncQuery.limit(0);
  return { schemaReady: true, publicationReady: !syncError, published: published ? { revision: String(published.revision_id), publishedAt: published.published_at, synced: Boolean(sync?.synced_at), syncError: sync?.last_error || "" } : null, document: validateLandingDocument(data.draft_document), version: data.draft_version, updatedAt: data.updated_at };
}

export async function getLandingHistory(before) {
  await requireLandingAdmin();
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("landing_page_revisions").select("id,draft_version,note,created_at").eq("page_slug", "home").order("id", { ascending: false }).limit(21);
  if (typeof before === "string" && /^[1-9]\d{0,18}$/.test(before)) query = query.lt("id", before);
  const { data, error } = await query;
  if (error) throw new Error("Riwayat belum dapat dimuat.");
  return { revisions: data.slice(0, 20).map((r) => ({ ...r, id: String(r.id) })), next: data.length > 20 ? String(data[19].id) : null };
}
