import { requireEditorialUser } from "@/lib/editorial";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArticleEditor from "@/components/ArticleEditor";

export const metadata = { title: "Artikel baru" };

export default async function NewArticlePage() {
  const { user, profile } = await requireEditorialUser();
  const supabase = await createSupabaseServerClient();
  const [{ data: categories }, { error: schemaError }] = await Promise.all([
    supabase.from("categories").select("id,title_id").order("title_id"),
    supabase.from("articles").select("content_json,content_legacy_backup,version,scheduled_at,publication_error").limit(0),
  ]);
  return <ArticleEditor article={{ id: null, title: "", excerpt: "", topic: "", tags: "", category: "", cover: "", status: "draft", version: 1, author: profile.full_name || "Penulis", workflowReady: !schemaError, schedulerReady: false }} initialContent={{ type: "doc", content: [{ type: "paragraph" }] }} canEdit schemaReady={!schemaError} admin={profile.role === "admin"} categories={categories || []} userId={user.id} />;
}
