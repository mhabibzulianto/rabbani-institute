import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirect, getSiteUrl } from "@/lib/sso";
import { reconcileOAuthUserToExistingEmail } from "@/lib/auth-oauth-reconcile";

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirect(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    try {
      const actionLink = await reconcileOAuthUserToExistingEmail({
        supabase,
        next,
      });

      if (actionLink) {
        return NextResponse.redirect(actionLink);
      }
    } catch (error) {
      console.error("OAuth identity reconciliation failed:", error);
    }
  }

  return NextResponse.redirect(new URL(next, getSiteUrl()));
}
