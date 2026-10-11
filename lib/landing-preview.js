import "server-only";
import { cookies } from "next/headers";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { validateLandingDocument } from "../packages/landing-page/index.mjs";
export async function getLandingPreview() {
  const token = (await cookies()).get("landing-preview-session")?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await createSupabasePublicClient().rpc("read_landing_preview", { session_token: token });
  if (error || !data) return null;
  try { return validateLandingDocument(data); } catch { return null; }
}
