import ArticleRenderer from "@/components/ArticleRenderer";
import { getDemoArticleRecord } from "@/lib/article-demo";

export default function EditorPreviewArticlePage() {
  const article = getDemoArticleRecord();

  return (
    <main className="page">
      <section className="article-hero">
        <div className="section-heading">
          <h1>{article.title}</h1>
          <p>{article.excerpt}</p>
        </div>
        <div className="article-meta-row">
          <span>{article.topic}</span>
          <span>8 Mei 2026</span>
          <span>2 menit baca</span>
        </div>
      </section>

      {article.cover_image_url ? (
        <section className="article-cover-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={article.title} src={article.cover_image_url} />
        </section>
      ) : null}

      <section className="article-reading-shell">
        <ArticleRenderer blocks={article.blocks} contentRaw={article.content_raw} />
      </section>
    </main>
  );
}
