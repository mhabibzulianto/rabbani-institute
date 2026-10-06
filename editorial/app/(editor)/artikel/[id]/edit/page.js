import { notFound } from "next/navigation";
import { getEditorialArticle } from "@/lib/articles";
import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canEditArticle, prepareEditorDocument } from "@/lib/editor-document.mjs";
import { getArticlePreview } from "@/lib/article-preview.mjs";
import ArticleEditor from "@/components/ArticleEditor";

export const metadata = { title: "Editor artikel" };

export default async function ArticleEditorPage({ params }) {
  const { id } = await params;
  const [{ article }, { user, profile }] = await Promise.all([getEditorialArticle(id), requireEditorialUser()]);
  if (!article) notFound();
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase.from("categories").select("id,title_id").order("title_id");
  const prepared = prepareEditorDocument(article);
  const ready = Object.hasOwn(article, "content_legacy_backup") && Object.hasOwn(article, "content_json") && Number.isSafeInteger(article.version);
  const workflowReady = Object.hasOwn(article,"scheduled_at") && Object.hasOwn(article,"publication_error");
  const { data: schedulerReady } = workflowReady && profile.role === "admin" ? await supabase.rpc("editorial_scheduler_ready") : { data: false };
  return <ArticleEditor key={`${id}:${article.version}`} article={{ id: String(article.id), title: article.title, excerpt: article.excerpt || "", topic: article.topic || "", tags: (article.tags || []).join(", "), category: article.category_id ? String(article.category_id) : "", cover: article.cover_image_url || "", status: article.status, version: article.version || 1, last_saved_at: article.last_saved_at, author: article.author?.full_name || "Penulis tanpa nama", note: article.admin_note || "", scheduled_at: article.scheduled_at || null, publication_error: article.publication_error || null, workflowReady, schedulerReady: schedulerReady === true }} initialContent={prepared.content} unsupportedHtml={prepared.unsupported ? getArticlePreview(article).html : null} canEdit={canEditArticle(profile, article, user.id) && !prepared.unsupported} schemaReady={ready} admin={profile.role === "admin"} categories={categories || []} userId={user.id} />;
}
