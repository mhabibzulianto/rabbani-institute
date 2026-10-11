"use server";
import { requireLandingAdmin } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateLandingDocument } from "@/lib/landing-document.mjs";
export async function createLandingPreview(input) {
  await requireLandingAdmin();
  let document;
  try { document = validateLandingDocument(input); }
  catch { return { ok: false, error: "Draft tidak valid. Periksa pengaturan blok." }; }
  let url;
  try {
    url = new URL("/landing-preview", process.env.LANDING_PUBLIC_ORIGIN || "https://www.rabbaniinstitute.id");
    if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new Error();
  } catch { return { ok: false, error: "Konfigurasi alamat preview tidak valid." }; }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_landing_preview", { next_document: document });
  if (error || typeof data !== "string") return { ok: false, error: ["PGRST202", "42883"].includes(error?.code) ? "Jalankan landing_page_preview_patch.sql sebelum membuka preview." : "Preview gagal dibuat. Tunggu sebentar lalu coba lagi." };
  url.hash = `ticket=${data}`;
  return { ok: true, url: url.toString() };
}
