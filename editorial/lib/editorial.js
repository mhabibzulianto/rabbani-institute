import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { canAccessEditorial } from "@/lib/access.mjs";

export async function touchEditorialMembership(userId) {
  if (!userId) return;
  // Local preview can run before the shared Supabase schema is migrated.
  // Authorization still runs in requireEditorialUser; production never skips.
  if (process.env.NODE_ENV === "development" && process.env.EDITORIAL_LOCAL_PREVIEW === "true") return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("touch_account_app", { target_app: "editorial" });
  if (error) throw new Error("Gagal mengaktifkan akses Editorial. Pastikan patch editorial_foundation_patch.sql sudah diterapkan.", { cause: error });
}

export async function requireEditorialUser() {
  const session = await getCurrentUser();
  if (!session.user) redirect("/auth?next=/beranda");
  if (!canAccessEditorial(session.profile)) redirect("/akses-ditolak");
  return session;
}
