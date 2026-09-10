"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { getSupabaseCookieOptions } from "@/lib/supabase/cookies";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();

  return createBrowserClient(
    url,
    anonKey,
    {
      cookieOptions: getSupabaseCookieOptions(),
    },
  );
}
