"use server";
import { revalidatePath } from "next/cache";
import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validArticleId, validateEditorDocument } from "@/lib/editor-document.mjs";
import { validateReviewInput, hasPublicationText, scheduleFromJakarta } from "@/lib/article-workflow.mjs";
import { safeMediaUrl } from "@/lib/media-validation.mjs";
import { getArticlePreview } from "@/lib/article-preview.mjs";

async function accessArticle(id, version) {
  const { user, profile } = await requireEditorialUser();
  if (!validArticleId(id)) return { error: "Artikel tidak valid." };
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("articles").select("*").eq("id",id);
  if (profile.role !== "admin") query = query.eq("author_id",user.id);
  const { data: article, error } = await query.maybeSingle();
  if (error || !article) return { error: "Artikel tidak tersedia atau akses berakhir.", code: "access" };
  if (!Object.hasOwn(article,"scheduled_at") || !Object.hasOwn(article,"publication_error")) return { error: "Workflow belum tersedia. Pastikan pembaruan database telah diterapkan.", code: "schema" };
  if (version != null && (!Number.isSafeInteger(version) || version !== article.version)) return { error: "Artikel telah berubah. Muat ulang sebelum melanjutkan.", code: "conflict" };
  return { supabase, article, profile };
}
function result(data, error) {
  if (error) return { ok: false, code: error.code === "40001" ? "conflict" : "workflow", error: error.code === "40001" ? "Artikel telah berubah. Muat ulang sebelum melanjutkan." : "Proses belum berhasil. Periksa koneksi, isi artikel, dan statusnya lalu coba lagi." };
  const article = Array.isArray(data) ? data[0] : data;
  if (!article?.version) return { ok: false, code: "conflict", error: "Hasil belum dapat dipastikan. Muat ulang untuk memeriksa status." };
  revalidatePath("/artikel"); revalidatePath(`/artikel/${article.id}/edit`);
  return { ok: true, version: article.version, status: article.status, note: article.admin_note || "", scheduled_at: article.scheduled_at, publication_error: article.publication_error };
}
export async function reviewEditorialArticle(input) {
  let review;
  try { review = validateReviewInput(input); } catch (error) { return { ok: false, error: error.message }; }
  const access = await accessArticle(input.id,input.version);
  if (access.error) return { ok: false, ...access };
  const { profile, article, supabase } = access;
  if (profile.role !== "admin" && !(article.status === "rejected" && review.status === "draft" || article.status === "draft" && review.status === "submitted")) return { ok: false, error: "Aksi review hanya tersedia bagi admin." };
  if (["submitted","published"].includes(review.status) && (!article.title?.trim() || !hasPublicationText(article.content_json))) return { ok: false, error: "Isi judul dan tulisan sebelum mengajukan atau menerbitkan." };
  const { data, error } = await supabase.rpc("transition_editorial_article", { target_article_id: input.id, expected_version: input.version, target_status: review.status, review_note: profile.role === "admin" ? review.note : null });
  return result(data,error);
}
export async function scheduleEditorialArticle(input) {
  let publishAt;
  try { publishAt = input.cancel ? null : scheduleFromJakarta(input.time); } catch (error) { return { ok: false, error: error.message }; }
  const access = await accessArticle(input.id,input.version);
  if (access.error) return { ok: false, ...access };
  if (access.profile.role !== "admin") return { ok: false, error: "Jadwal publikasi hanya tersedia bagi admin." };
  if (!input.cancel && !hasPublicationText(access.article.content_json)) return { ok: false, error: "Isi tulisan sebelum menjadwalkan publikasi." };
  const { data,error } = await access.supabase.rpc("schedule_editorial_article", { target_article_id: input.id, expected_version: input.version, publish_at: publishAt });
  return result(data,error);
}
export async function saveEditorialReviewNote(input) {
  if (typeof input.note !== "string" || input.note.length > 4000) return { ok:false, error:"Catatan redaksi maksimal 4.000 karakter." };
  const access = await accessArticle(input.id,input.version);
  if (access.error) return { ok:false,...access };
  if (access.profile.role !== "admin" || access.article.status !== "submitted") return { ok:false,error:"Catatan review hanya dapat diubah admin saat artikel diajukan." };
  const { data,error } = await access.supabase.from("articles").update({ admin_note:input.note.trim() || null }).eq("id",input.id).eq("version",input.version).eq("status","submitted").select("id,version,status,admin_note,scheduled_at,publication_error").maybeSingle();
  return result(data,error);
}
export async function snapshotEditorialArticle({ id, version }) {
  const access = await accessArticle(id,version);
  if (access.error) return { ok: false, ...access };
  const { data,error } = await access.supabase.rpc("snapshot_editorial_article", { target_article_id: id, expected_version: version });
  return error ? { ok: false, code: error.code === "40001" ? "conflict" : "snapshot", error: "Snapshot belum dibuat. Periksa koneksi lalu coba lagi." } : { ok: true, id: String(data) };
}
export async function listArticleRevisions({ id, page = 1 }) {
  const access = await accessArticle(id);
  if (access.error) return { ok: false, ...access, items: [] };
  const currentPage = Math.max(1, Math.min(10000, Number.parseInt(page,10) || 1));
  const { data,error,count } = await access.supabase.from("article_revisions").select("id,revision_number,article_version,reason,metadata_json,created_at",{ count: "exact" }).eq("article_id",id).order("revision_number",{ ascending:false }).range((currentPage-1)*10,currentPage*10-1);
  return error ? { ok:false, error:"Riwayat belum dapat dimuat. Coba lagi.", items:[] } : { ok:true, items:data.map(item=>({...item,id:String(item.id)})), total:count };
}
export async function previewArticleRevision({ id, revisionId }) {
  const access = await accessArticle(id);
  if (access.error) return { ok: false, ...access };
  if (!validArticleId(revisionId)) return { ok: false, error: "Revisi tidak valid." };
  const { data,error } = await access.supabase.from("article_revisions").select("*").eq("article_id",id).eq("id",revisionId).maybeSingle();
  if (error || !data) return { ok:false, error:"Revisi tidak tersedia." };
  return { ok:true, preview:{ ...getArticlePreview(data), id:String(data.id), title:data.metadata_json.title, excerpt:data.metadata_json.excerpt || "", revision_number:data.revision_number, created_at:data.created_at, coverHtml:getArticlePreview({ cover_image_url:data.metadata_json.cover_image_url }).coverHtml } };
}
export async function restoreArticleRevision({ id, version, revisionId }) {
  if (!validArticleId(revisionId)) return { ok:false, error:"Revisi tidak valid." };
  const access = await accessArticle(id, version);
  if (access.error) return { ok:false, ...access };
  if (!["draft", "rejected"].includes(access.article.status)) return { ok:false, error:"Kembalikan artikel ke draft sebelum memulihkan revisi." };
  const { data, error } = await access.supabase.rpc("restore_editorial_revision", { target_article_id:id, expected_version:version, target_revision_id:revisionId });
  if (error?.code === "PGRST202" || error?.code === "42883") return { ok:false, error:"Jalankan editorial_polish_patch.sql untuk mengaktifkan pemulihan revisi." };
  return result(data,error);
}
export async function previewEditorialDraft(input) {
  await requireEditorialUser();
  try {
    const doc = validateEditorDocument(input.doc);
    if (typeof input.title !== "string" || input.title.length > 200 || typeof input.excerpt !== "string" || input.excerpt.length > 500 || input.cover && !safeMediaUrl(input.cover)) throw new Error("Informasi preview tidak valid.");
    return { ok:true, preview:{ ...getArticlePreview({ content_json:doc, cover_image_url:input.cover, title:input.title }), title:input.title || "Tanpa judul", excerpt:input.excerpt } };
  } catch(error) { return { ok:false,error:error.message }; }
}
