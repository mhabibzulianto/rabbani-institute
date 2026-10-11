"use server";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireLandingAdmin } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDefaultLandingDocument } from "@/lib/landing-document.mjs";
import { validateLandingPublication, landingChanges } from "../../packages/landing-page/publication.mjs";
import { signLandingRequest, landingRequestProof } from "../../packages/landing-page/revalidation.mjs";
import { createLandingPreview } from "@/lib/landing-preview-actions";

const row = (data) => Array.isArray(data) ? data[0] : data;
const validVersion = (value) => Number.isSafeInteger(value) && value > 0;
const revisionId = (value) => typeof value === "string" && /^[1-9]\d{0,18}$/.test(value);
async function draftAtVersion(supabase, version) {
  if (!validVersion(version)) return { error: "Versi draft tidak valid." };
  const { data, error } = await supabase.from("landing_pages").select("draft_document,draft_version").eq("slug", "home").single();
  if (error) return { error: "Draft belum dapat dibaca." };
  const schema = await supabase.from("landing_publication_sync").select("revision_id").limit(0);
  if (schema.error) return { error: "Jalankan landing_page_publication_patch.sql sebelum terbit." };
  if (data.draft_version !== version) return { error: "Draft telah berubah. Muat versi server terbaru sebelum terbit.", conflict: true };
  try { return { document: validateLandingPublication(data.draft_document) }; }
  catch (error) { return { error: error.message }; }
}
async function syncPublication(supabase, revision) {
  let problem = "";
  try {
    const target = new URL("/api/landing-revalidate", process.env.LANDING_PUBLIC_ORIGIN || "https://www.rabbaniinstitute.id");
    if (target.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && target.protocol === "http:" && ["localhost", "127.0.0.1"].includes(target.hostname))) throw new Error("Alamat sinkronisasi tidak valid.");
    const body = JSON.stringify({ page: "home", revision, nonce: randomBytes(32).toString("hex"), timestamp: Math.floor(Date.now() / 1000) });
    const signature = signLandingRequest(body, process.env.LANDING_REVALIDATION_SECRET);
    const registered = await supabase.rpc("register_landing_sync", { target_revision: revision, request_proof: landingRequestProof(signature) });
    if (registered.error) throw new Error("Status publikasi berubah atau patch sinkronisasi belum tersedia.");
    const response = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json", "x-landing-signature": signature }, body, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Situs utama belum menerima sinkronisasi (HTTP ${response.status}).`);
    const result = await response.json();
    if (!result.ok || result.revision !== revision) throw new Error("Sinkronisasi belum terkonfirmasi.");
  } catch (error) {
    problem = error.message === "Revalidation secret unavailable" ? "Konfigurasi secret sinkronisasi belum tersedia." : error.message?.startsWith("Situs utama") || error.message?.startsWith("Status publikasi") || error.message?.startsWith("Alamat") ? error.message : "Koneksi sinkronisasi belum berhasil. Coba lagi.";
  }
  try {
    const recorded = await supabase.rpc("finish_landing_sync", { target_revision: revision, succeeded: !problem, error_note: problem });
    if (recorded.error && !problem) problem = "Cache diperbarui, tetapi status sinkronisasi belum tercatat. Coba sinkronisasi lagi.";
  } catch { problem ||= "Status sinkronisasi belum tercatat. Coba sinkronisasi lagi."; }
  return { synced: !problem, syncError: problem };
}
export async function prepareLandingPublication(version) {
  await requireLandingAdmin();
  const supabase = await createSupabaseServerClient();
  const draft = await draftAtVersion(supabase, version);
  if (draft.error) return { ok: false, ...draft };
  const published = await supabase.from("landing_page_publications").select("document").eq("page_slug", "home").maybeSingle();
  if (published.error) return { ok: false, error: "Versi publik belum dapat dibaca." };
  return { ok: true, version, firstPublish: !published.data, changes: landingChanges(published.data?.document || createDefaultLandingDocument(), draft.document) };
}
export async function publishLandingDraft({ version, note = "" }) {
  await requireLandingAdmin();
  if (typeof note !== "string" || note.length > 1000) return { ok: false, error: "Catatan maksimal 1000 karakter." };
  const supabase = await createSupabaseServerClient();
  const draft = await draftAtVersion(supabase, version);
  if (draft.error) return { ok: false, ...draft };
  const { data, error } = await supabase.rpc("publish_landing_page", { target_slug: "home", expected_version: version, revision_note: note.trim() });
  if (error) return { ok: false, conflict: error.code === "40001", error: error.code === "40001" ? "Draft telah berubah. Muat versi terbaru." : error.code === "22023" ? "Isi landing atau pilihan konten belum layak terbit. Periksa judul, gambar, tombol, dan ID konten publik." : "Publikasi belum terkonfirmasi. Periksa riwayat sebelum mencoba lagi." };
  const published = row(data);
  if (!published?.revision_id) return { ok: false, error: "Publikasi belum terkonfirmasi. Periksa riwayat." };
  const revision = String(published.revision_id);
  // Publication is already committed; cache failure must not be reported as a failed publish.
  const sync = await syncPublication(supabase, revision);
  revalidatePath("/halaman-utama");
  return { ok: true, revision, publishedAt: published.published_at, ...sync };
}
export async function retryLandingSync(revision) {
  await requireLandingAdmin();
  if (!revisionId(revision)) return { ok: false, error: "Revisi tidak valid." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("landing_page_publications").select("revision_id").eq("page_slug", "home").single();
  if (error || String(data.revision_id) !== revision) return { ok: false, error: "Publikasi telah berubah. Muat ulang untuk memeriksa revisi terbaru." };
  const result = await syncPublication(supabase, revision);
  revalidatePath("/halaman-utama");
  return { ok: true, ...result };
}
export async function restoreLandingRevision({ revision, version }) {
  await requireLandingAdmin();
  if (!revisionId(revision) || !validVersion(version)) return { ok: false, error: "Revisi atau versi draft tidak valid." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("restore_landing_revision", { target_revision: revision, expected_version: version });
  if (error) return { ok: false, error: error.code === "40001" ? "Draft berubah sejak riwayat dibuka. Muat ulang sebelum restore." : "Draft belum dipulihkan. Periksa patch publikasi dan koneksi." };
  const restored = row(data);
  if (restored?.draft_version !== version + 1) return { ok: false, error: "Hasil restore belum terkonfirmasi. Muat ulang halaman." };
  revalidatePath("/halaman-utama"); revalidatePath("/halaman-utama/edit");
  return { ok: true, version: restored.draft_version };
}

export async function previewLandingRevision(revision) {
  await requireLandingAdmin();
  if (!revisionId(revision)) return { ok: false, error: "Revisi tidak valid." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("landing_page_revisions").select("document").eq("page_slug", "home").eq("id", revision).single();
  if (error || !data) return { ok: false, error: "Revisi tidak tersedia." };
  return createLandingPreview(data.document);
}
