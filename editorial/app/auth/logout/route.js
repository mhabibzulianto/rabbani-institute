import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/auth";

export async function GET(request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const next = getSafeRedirect(new URL(request.url).searchParams.get("next") || "/", "/");
  const url = new URL(next, request.url);
  return NextResponse.redirect(url);
}
