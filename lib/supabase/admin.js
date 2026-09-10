import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const serviceRoleKey =
    typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string"
      ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim()
      : "";
  const { url } = getSupabaseEnv();

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
