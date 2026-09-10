import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

function cleanEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const url = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const domain = cleanEnvValue(process.env.NEXT_PUBLIC_RABBANI_COOKIE_DOMAIN);

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      ...(domain ? { domain } : {}),
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
