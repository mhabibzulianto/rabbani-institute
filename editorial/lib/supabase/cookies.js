function cleanEnvValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function getSupabaseCookieOptions() {
  const domain = cleanEnvValue(process.env.NEXT_PUBLIC_RABBANI_COOKIE_DOMAIN);

  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(domain ? { domain } : {}),
  };
}
