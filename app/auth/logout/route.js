import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/sso";

export async function GET(request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const next = getSafeRedirect(new URL(request.url).searchParams.get("next") || "/auth", "/auth");
  const url = new URL(next, request.url);
  return NextResponse.redirect(url);
}
