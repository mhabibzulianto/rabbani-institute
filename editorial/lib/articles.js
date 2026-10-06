import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireEditorialUser } from "@/lib/editorial";
import { canReviewArticles } from "@/lib/access.mjs";
import { applyArticleFilters, normalizeArticleFilters, ARTICLE_PAGE_SIZE } from "@/lib/article-list.mjs";

export async function getEditorialArticles(params) {
  const { user, profile } = await requireEditorialUser();
  const admin = canReviewArticles(profile);
  const filters = normalizeArticleFilters(params);
  if (!admin) filters.author = "";
  const supabase = await createSupabaseServerClient();
  const countResult = await applyArticleFilters(
    supabase.from("articles").select("id", { count: "exact", head: true }), filters, user.id, admin,
  );
  if (countResult.error) {
    console.error("Editorial article list:", countResult.error.code);
    return { error: true, articles: [], filters, total: 0, pages: 1, categories: [], authors: [], admin };
  }
  const total = countResult.count || 0;
  const pages = Math.max(1, Math.ceil(total / ARTICLE_PAGE_SIZE));
  // Clamp stale URLs after deletion or a changed result set.
  if (filters.page > pages) return { redirectPage: pages, filters };
  const [records, categories, authors] = await Promise.all([
    applyArticleFilters(supabase.from("articles").select(
      "id, title, slug, status, author_id, category_id, excerpt, created_at, updated_at, author:profiles!articles_author_id_fkey(full_name), category:categories!articles_category_id_fkey(title_id)",
    ), filters, user.id, admin).order("updated_at", { ascending: false }).order("id", { ascending: false })
      .range((filters.page - 1) * ARTICLE_PAGE_SIZE, filters.page * ARTICLE_PAGE_SIZE - 1),
    supabase.from("categories").select("id, title_id").order("title_id"),
    // Match the same author permissions used to enter the editorial workspace.
    admin ? supabase.from("profiles").select("id, full_name").or("role.in.(admin,instructor),is_writer.eq.true").order("full_name") : Promise.resolve({ data: [] }),
  ]);
  if (records.error) {
    console.error("Editorial article list:", records.error.code);
    return { error: true, articles: [], filters, total: 0, pages: 1, categories: categories.data || [], authors: authors.data || [], admin };
  }
  return {
    articles: records.data || [], total, pages, filters, admin,
    categories: categories.data || [], authors: authors.data || [],
    optionsError: Boolean(categories.error || authors.error),
  };
}

export async function getEditorialArticle(articleId) {
  const { user, profile } = await requireEditorialUser();
  if (!/^[1-9]\d{0,18}$/.test(articleId) || BigInt(articleId) > 9223372036854775807n) return { article: null };
  const supabase = await createSupabaseServerClient();
  // Article body columns differ between legacy and migrated databases. Selecting
  // this one authorized row includes whichever body formats are available.
  let query = supabase.from("articles").select("*, author:profiles!articles_author_id_fkey(full_name), category:categories!articles_category_id_fkey(title_id)").eq("id", articleId);
  if (!canReviewArticles(profile)) query = query.eq("author_id", user.id);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("Editorial article preview:", error.code, error.message);
    throw new Error("Artikel tidak dapat dimuat. Coba lagi.", { cause: error });
  }
  return { article: data };
}
