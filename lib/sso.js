const fallbackPath = process.env.NEXT_PUBLIC_MADRASAH_URL
  ? `${process.env.NEXT_PUBLIC_MADRASAH_URL.replace(/\/+$/, "")}/beranda`
  : "https://madrasah.rabbaniinstitute.id/beranda";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function getAllowedOrigins() {
  return (process.env.NEXT_PUBLIC_RABBANI_ALLOWED_ORIGINS || getSiteUrl())
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function getSafeRedirect(next, fallback = fallbackPath) {
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

export function buildCallbackUrl(next) {
  const callbackUrl = new URL("/auth/callback", getSiteUrl());
  const safeNext = getSafeRedirect(next);
  callbackUrl.searchParams.set("next", safeNext);
  return callbackUrl.toString();
}
