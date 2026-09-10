const MADRASAH_BASE_URL = process.env.NEXT_PUBLIC_MADRASAH_URL || "https://madrasah.rabbaniinstitute.id";
const EDITORIAL_BASE_URL = process.env.NEXT_PUBLIC_EDITORIAL_URL || "https://editorial.rabbaniinstitute.id";

function normalizeBaseUrl(url) {
  return (url || "").replace(/\/+$/, "");
}

function buildUrl(baseUrl, path = "") {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";
  return `${normalizedBaseUrl}${normalizedPath}`;
}

export const platformUrls = {
  madrasahBaseUrl: normalizeBaseUrl(MADRASAH_BASE_URL),
  editorialBaseUrl: normalizeBaseUrl(EDITORIAL_BASE_URL),
  classesHome: buildUrl(MADRASAH_BASE_URL, "/kelas"),
  classesDashboard: buildUrl(MADRASAH_BASE_URL, "/beranda"),
  articleHome: buildUrl(EDITORIAL_BASE_URL, "/artikel"),
};

export function getCoursePublicUrl(slug) {
  return buildUrl(MADRASAH_BASE_URL, slug ? `/kelas/${slug}` : "/kelas");
}

export function getArticlePublicUrl(slug) {
  return buildUrl(EDITORIAL_BASE_URL, slug ? `/artikel/${slug}` : "/artikel");
}
