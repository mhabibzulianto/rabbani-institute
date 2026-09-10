import BodyClassName from "@/components/BodyClassName";
import ArticlePlateInput from "@/components/ArticlePlateInput";
import { getArticleEditorValue } from "@/lib/gutenberg-content";

export default function ArticleForm({
  action,
  article = null,
  backHref,
  editorBase = "/editor/articles",
  notice = null,
  isAdmin = false,
  topics = [],
}) {
  return (
    <form action={action} className="article-studio-page">
      <BodyClassName className="article-studio-mode" />
      <input name="editorBase" type="hidden" value={editorBase} />
      <input name="returnBase" type="hidden" value={backHref} />

      <ArticlePlateInput
        articleId={article?.id || null}
        article={article}
        backHref={backHref}
        initialValue={getArticleEditorValue(article)}
        isAdmin={isAdmin}
        notice={notice}
        name="contentRaw"
        submitLabel={isAdmin ? "Publikasi" : "Submit"}
        topics={topics}
      />
    </form>
  );
}
