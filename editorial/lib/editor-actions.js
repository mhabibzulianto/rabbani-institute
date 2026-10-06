"use server";

import { revalidatePath } from "next/cache";
import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canEditArticle, normalizeEditorPayload, serializeLegacyDocument, validateEditorDocument, validArticleId } from "@/lib/editor-document.mjs";
import { hasPublicationText } from "@/lib/article-workflow.mjs";

async function authorizedArticle(id) {
  const { user, profile } = await requireEditorialUser();
  if (!validArticleId(id)) return { error: "Artikel tidak valid." };
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("articles").select("*").eq("id", id);
  if (profile.role !== "admin") query = query.eq("author_id", user.id);
  const { data: article, error } = await query.maybeSingle();
  if (error || !article) return { error: "Artikel tidak tersedia atau Anda tidak memiliki akses." };
  if (!Object.hasOwn(article, "content_legacy_backup") || !Object.hasOwn(article, "content_json") || !Number.isSafeInteger(article.version)) return { error: "Jalankan patch editorial_foundation_patch.sql terbaru sebelum menyimpan ke Supabase.", code: "schema" };
  return { user, profile, article, supabase };
}

export async function saveEditorialArticle(input) {
  let payload;
  try { payload = normalizeEditorPayload(input); } catch (error) { return { ok: false, code: "validation", error: error.message }; }
  const access = await authorizedArticle(input.id);
  if (access.error) return { ok: false, code: access.code || "access", error: access.error };
  const { user, profile, article, supabase } = access;
  if (!canEditArticle(profile, article, user.id)) return { ok: false, code: "locked", error: "Artikel terkunci karena sedang direview, diterbitkan, atau diarsipkan." };
  if (article.version !== input.version) return { ok: false, code: "conflict", error: "Artikel berubah di tab atau perangkat lain. Salinan tulisan Anda tetap tersedia; muat ulang sebelum melanjutkan." };
  // Metadata-only saves must not change legacy fields: the shared database
  // deliberately invalidates unchanged Tiptap JSON when a legacy editor writes.
  let unchangedContent = false;
  try { unchangedContent = article.content_json != null && JSON.stringify(validateEditorDocument(article.content_json)) === JSON.stringify(payload.content_json); } catch { /* Import replaces a legacy document. */ }
  const legacy = unchangedContent ? {} : serializeLegacyDocument(payload.content_json);
  if (article.content_json == null && article.content_legacy_backup == null) payload.content_legacy_backup = { blocks: article.blocks, content_raw: article.content_raw, captured_at: new Date().toISOString() };
  let update = supabase.from("articles").update({ ...payload, ...legacy }).eq("id", input.id).eq("version", input.version).eq("status", article.status);
  if (profile.role !== "admin") update = update.eq("author_id", user.id);
  const { data, error } = await update.select("version,last_saved_at,status").maybeSingle();
  if (error) return { ok: false, code: "save", error: "Gagal menyimpan. Salinan lokal tetap tersedia. Periksa koneksi dan coba lagi." };
  if (!data) return { ok: false, code: "conflict", error: "Artikel berubah atau akses berakhir. Muat ulang sebelum melanjutkan." };
  revalidatePath("/artikel");
  return { ok: true, ...data };
}

export async function publishEditorialArticle({ id, version }) {
  const access = await authorizedArticle(id);
  if (access.error) return { ok: false, error: access.error };
  const { article, profile, supabase } = access;
  if (!Number.isSafeInteger(version) || article.version !== version) return { ok: false, code: "conflict", error: "Artikel berubah. Muat ulang sebelum mengajukan atau menerbitkan." };
  if (!Object.hasOwn(article,"scheduled_at")) return { ok: false, error: "Terapkan pembaruan workflow sebelum publish agar snapshot tersimpan." };
  if (!article.title?.trim() || !hasPublicationText(article.content_json)) return { ok: false, error: "Isi judul dan tulisan sebelum publish." };
  const admin = profile.role === "admin";
  if (!(admin ? ["draft", "rejected", "submitted"] : ["draft", "rejected"]).includes(article.status)) return { ok: false, error: "Status artikel tidak dapat diajukan atau diterbitkan." };
  const transitions = [...(article.status === "rejected" ? ["draft"] : []), ...(article.status !== "submitted" ? ["submitted"] : []), ...(admin ? ["published"] : [])];
  let current = { version, status: article.status };
  for (const targetStatus of transitions) {
    const { data, error } = await supabase.rpc("transition_editorial_article", { target_article_id: id, expected_version: current.version, target_status: targetStatus });
    if (error) return { ok: false, code: error.code === "40001" ? "conflict" : "publish", error: "Proses belum selesai. Status terakhir sudah diperbarui; periksa koneksi sebelum mencoba lagi.", ...current };
    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated?.version) return { ok: false, error: "Status belum dapat dipastikan. Muat ulang untuk memeriksa hasil proses.", ...current };
    current = { version: updated.version, status: updated.status, last_saved_at: updated.last_saved_at };
  }
  revalidatePath("/artikel");
  return { ok: true, ...current };
}
