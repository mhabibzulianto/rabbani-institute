import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_HOSTS = new Set(["rabbaniinstitute.id", "www.rabbaniinstitute.id"]);
const EDITORIAL_HOST = normalizeHost(process.env.NEXT_PUBLIC_EDITORIAL_HOST || "editorial.rabbaniinstitute.id");
const ACCOUNT_HOST = normalizeHost(process.env.NEXT_PUBLIC_ACCOUNT_HOST || "account.rabbaniinstitute.id");

const EDITORIAL_ENTRY_PATH = "/auth";
const ACCOUNT_PATHS = new Set(["/profile", "/security", "/addresses", "/payments"]);
const LEGACY_ACCOUNT_PREFIXES = ["/account", "/account/"];
const LEGACY_EDITORIAL_PREFIXES = ["/auth", "/auth/", "/admin", "/admin/", "/editor-preview", "/editor-preview/", "/studio-preview", "/studio-preview/"];
const PRIVATE_API_PREFIXES = ["/api/auth", "/api/articles/autosave", "/api/admin", "/api/studio"];

export function middleware(request: NextRequest) {
  const host = normalizeHost(request.headers.get("host") || request.nextUrl.hostname);

  if (!PUBLIC_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;

  if (PRIVATE_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (ACCOUNT_PATHS.has(pathname) || LEGACY_ACCOUNT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return NextResponse.redirect(buildUrl(ACCOUNT_HOST, mapAccountPath(pathname), search));
  }

  if (LEGACY_EDITORIAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return NextResponse.redirect(buildUrl(EDITORIAL_HOST, EDITORIAL_ENTRY_PATH, ""));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/).*)",
  ],
};

function normalizeHost(value) {
  return `${value || ""}`.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
}

function buildUrl(hostname, pathname = "/", search = "") {
  const url = new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, `https://${hostname}`);
  url.search = search;
  return url;
}

function mapAccountPath(pathname) {
  if (pathname === "/account") {
    return "/";
  }

  if (pathname.startsWith("/account/")) {
    return pathname.replace(/^\/account/, "") || "/";
  }

  return pathname;
}
