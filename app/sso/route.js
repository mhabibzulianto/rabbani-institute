import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirect, getSiteUrl } from "@/lib/sso";

export async function GET(request) {
  const url = new URL(request.url);
  const next = getSafeRedirect(url.searchParams.get("next"));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return NextResponse.redirect(new URL(next, getSiteUrl()));
  }

  const authUrl = new URL("/auth", getSiteUrl());
  authUrl.searchParams.set("next", next);
  return NextResponse.redirect(authUrl);
}
