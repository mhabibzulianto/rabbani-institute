const defaultProtectedPath = "/beranda";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001";
}

export function getAllowedOrigins() {
  return (process.env.NEXT_PUBLIC_RABBANI_ALLOWED_ORIGINS || getSiteUrl())
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getSafeRedirect(next, fallback = defaultProtectedPath) {
  if (!next) {
    return fallback;
  }

  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }

  try {
    const url = new URL(next);
    if (getAllowedOrigins().includes(url.origin)) {
      return url.toString();
    }
  } catch {
    return fallback;
  }

  return fallback;
}

export function toAbsoluteUrl(nextPath = defaultProtectedPath) {
  return new URL(getSafeRedirect(nextPath), getSiteUrl()).toString();
}

export function buildCallbackUrl(nextPath = defaultProtectedPath) {
  const callbackUrl = new URL("/auth/callback", getSiteUrl());
  callbackUrl.searchParams.set("next", getSafeRedirect(nextPath));
  return callbackUrl.toString();
}
