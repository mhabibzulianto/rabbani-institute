import { NextResponse } from "next/server";
import { getSafeRedirect, getSiteUrl } from "@/lib/auth";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { canAccessEditorial } from "@/lib/access.mjs";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirect(requestUrl.searchParams.get("next") || "/beranda");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/auth?error=Tautan%20masuk%20tidak%20valid%20atau%20sudah%20kedaluwarsa.", getSiteUrl()));
    }
  }

  const { user, profile } = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/auth", getSiteUrl()));
  if (!canAccessEditorial(profile)) {
    return NextResponse.redirect(new URL("/akses-ditolak", getSiteUrl()));
  }

  return NextResponse.redirect(new URL(next, getSiteUrl()));
}
