"use server";

import { requireLandingAdmin } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateLandingDocument } from "@/lib/landing-document.mjs";
import { landingSaveAcknowledgement } from "@/lib/landing-editor.mjs";
import { revalidatePath } from "next/cache";

export async function saveLandingDraft(input) {
  await requireLandingAdmin();
  if (!input || !Number.isSafeInteger(input.version) || input.version < 1) {
    return { ok: false, error: "Versi draft tidak valid." };
  }
  let document;
  try { document = validateLandingDocument(input.document); }
  catch (error) { return { ok: false, error: error.message }; }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("save_landing_draft", {
    target_slug: "home", expected_version: input.version, next_document: document,
  });
  if (error) return { ok: false, conflict: error.code === "40001", error: error.code === "40001" ? "Draft diubah admin lain. Muat ulang sebelum menyimpan." : "Gagal menyimpan draft landing." };
  const result = landingSaveAcknowledgement(data, input.version);
  if (result.ok) revalidatePath("/halaman-utama");
  return result;
}
