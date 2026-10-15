export const MAX_ARTICLE_TAGS = 20;
export const MAX_ARTICLE_TAG_LENGTH = 40;

export function normalizeArticleTag(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function parseArticleTags(value) {
  const tags = [];
  for (const part of String(value ?? "").split(/[,，]/)) {
    const tag = normalizeArticleTag(part);
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function serializeArticleTags(tags) {
  return tags.map(normalizeArticleTag).filter(Boolean).join(", ");
}
