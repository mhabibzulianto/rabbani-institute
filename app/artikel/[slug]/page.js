/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleRenderer from "@/components/ArticleRenderer";
import { getPublicArticleBySlug, getArticleExcerpt, getArticleReadingLabel } from "@/lib/articles";
import { formatDate, localize } from "@/lib/data";

export const revalidate = 300;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) return { title: "Artikel tidak ditemukan" };
  return { title: article.title, description: getArticleExcerpt(article) };
}

export default async function ArticlePage({ params }) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="page">
      <Link className="button secondary" href="/artikel">← Semua artikel</Link>
      <article className="article-reading-shell">
        <header className="article-hero">
          <p className="section-label">{localize(article.category, "title", "id") || "Artikel"}</p>
          <h1>{article.title}</h1>
          {article.excerpt ? <p className="policy-intro">{getArticleExcerpt(article)}</p> : null}
          <div className="article-meta-row">
            <span>{article.author?.full_name || "Tim Rabbani Institute"}</span>
            <span>{formatDate(article.published_at || article.created_at)}</span>
            <span>{getArticleReadingLabel(article)}</span>
          </div>
          {article.cover_image_url ? (
            <div className="article-card-image"><img src={article.cover_image_url} alt={article.title} /></div>
          ) : null}
        </header>
        <ArticleRenderer contentRaw={article.content_raw} blocks={article.blocks} />
      </article>
    </main>
  );
}
