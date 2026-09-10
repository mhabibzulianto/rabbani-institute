import { unstable_cache } from "next/cache";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAuthorArticles, isAdmin } from "@/lib/access";
import { getArticleContentRaw, getArticleContentText, getArticleExcerptText } from "@/lib/gutenberg-content";

const ARTICLE_BASE_SELECT = [
  "id",
  "author_id",
  "category_id",
  "status",
  "title",
  "slug",
  "topic",
  "tags",
  "excerpt",
  "cover_image_url",
  "content_raw",
  "blocks",
  "submitted_at",
  "published_at",
  "created_at",
  "updated_at",
  "author:profiles(id, full_name)",
  "category:categories(id, slug, title_id, title_ar)",
].join(", ");

const ARTICLE_LEGACY_SELECT = [
  "id",
  "author_id",
  "category_id",
  "status",
  "title",
  "slug",
  "excerpt",
  "cover_image_url",
  "blocks",
  "published_at",
  "created_at",
  "updated_at",
  "author:profiles(id, full_name)",
  "category:categories(id, slug, title_id, title_ar)",
].join(", ");

function isMissingArticleSchema(error) {
  const message = error?.message || "";
  return (
    /does not exist/i.test(message)
    || /Could not find .* in the schema cache/i.test(message)
    || error?.code === "42P01"
    || error?.code === "42703"
  );
}

async function fetchPublishedArticles(client, limit = null) {
  let query = client
    .from("articles")
    .select(ARTICLE_BASE_SELECT)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    if (!isMissingArticleSchema(error)) {
      console.error(error);
      return [];
    }

    let legacyQuery = client
      .from("articles")
      .select(ARTICLE_LEGACY_SELECT)
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (limit) {
      legacyQuery = legacyQuery.limit(limit);
    }

    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (legacyError) {
      if (!isMissingArticleSchema(legacyError)) {
        console.error(legacyError);
      }
      return [];
    }

    return (legacyData || []).map(normalizeArticleRecord);
  }

  return (data || []).map(normalizeArticleRecord);
}

export async function getPublishedArticlesPublic(limit = null) {
  const getCachedArticles = unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
      return fetchPublishedArticles(supabase, limit);
    },
    [`public-articles-${limit || "all"}`],
    { revalidate: 300 },
  );

  return getCachedArticles();
}

export async function getPublishedArticles(limit = null) {
  const supabase = await createSupabaseServerClient();
  return fetchPublishedArticles(supabase, limit);
}

async function fetchArticleBySlug(client, slug, publicOnly = true) {
  let query = client
    .from("articles")
    .select(ARTICLE_BASE_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (publicOnly) {
    query = query.eq("status", "published");
  }

  const { data, error } = await query;

  if (error) {
    if (!isMissingArticleSchema(error)) {
      console.error(error);
      return null;
    }

    let legacyQuery = client
      .from("articles")
      .select(ARTICLE_LEGACY_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    if (publicOnly) {
      legacyQuery = legacyQuery.eq("status", "published");
    }

    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (legacyError) {
      if (!isMissingArticleSchema(legacyError)) {
        console.error(legacyError);
      }
      return null;
    }

    return normalizeArticleRecord(legacyData);
  }

  return normalizeArticleRecord(data);
}

export async function getPublicArticleBySlug(slug) {
  const getCachedArticle = unstable_cache(
    async () => {
      const supabase = createSupabasePublicClient();
      return fetchArticleBySlug(supabase, slug, true);
    },
    [`public-article-${slug}`],
    { revalidate: 300 },
  );

  return getCachedArticle();
}

export async function getArticleStudioEntries(user, profile) {
  if (!canAuthorArticles(profile)) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("articles")
    .select(ARTICLE_BASE_SELECT)
    .order("updated_at", { ascending: false });

  if (!isAdmin(profile)) {
    query = query.eq("author_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    if (!isMissingArticleSchema(error)) {
      console.error(error);
      return [];
    }

    let legacyQuery = supabase
      .from("articles")
      .select(ARTICLE_LEGACY_SELECT)
      .order("updated_at", { ascending: false });

    if (!isAdmin(profile)) {
      legacyQuery = legacyQuery.eq("author_id", user.id);
    }

    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (legacyError) {
      if (!isMissingArticleSchema(legacyError)) {
        console.error(legacyError);
      }
      return [];
    }

    return (legacyData || []).map(normalizeArticleRecord);
  }

  return (data || []).map(normalizeArticleRecord);
}

export async function getArticleTopics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select("topic")
    .not("topic", "is", null)
    .order("topic", { ascending: true });

  if (error) {
    if (!isMissingArticleSchema(error)) {
      console.error(error);
    }
    return [];
  }

  return Array.from(
    new Set(
      (data || [])
        .map((item) => `${item.topic || ""}`.trim())
        .filter(Boolean),
    ),
  );
}

export async function getArticleCategories() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, title_id, title_ar")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

export async function getArticleForEdit(articleId, user, profile) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ARTICLE_BASE_SELECT)
    .eq("id", articleId)
    .maybeSingle();

  if (error) {
    if (!isMissingArticleSchema(error)) {
      console.error(error);
      return null;
    }

    const { data: legacyData, error: legacyError } = await supabase
      .from("articles")
      .select(ARTICLE_LEGACY_SELECT)
      .eq("id", articleId)
      .maybeSingle();

    if (legacyError) {
      if (!isMissingArticleSchema(legacyError)) {
        console.error(legacyError);
      }
      return null;
    }

    const normalizedLegacy = normalizeArticleRecord(legacyData);

    if (!normalizedLegacy) {
      return null;
    }

    if (!isAdmin(profile) && normalizedLegacy.author_id !== user.id) {
      return null;
    }

    return normalizedLegacy;
  }

  const normalized = normalizeArticleRecord(data);

  if (!normalized) {
    return null;
  }

  if (!isAdmin(profile) && normalized.author_id !== user.id) {
    return null;
  }

  return normalized;
}

export function getArticleExcerpt(article) {
  return getArticleExcerptText(article);
}

export function getArticleReadingLabel(article) {
  const textLength = getArticleContentText(getArticleContentRaw(article)).length;

  const minutes = Math.max(1, Math.ceil(textLength / 900));
  return `${minutes} menit baca`;
}

function normalizeArticleRecord(article) {
  if (!article) {
    return null;
  }

  return {
    ...article,
    topic: article.topic || "",
    tags: Array.isArray(article.tags) ? article.tags : [],
    content_raw: getArticleContentRaw(article),
  };
}
