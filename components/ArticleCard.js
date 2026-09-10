/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { formatDate, localize } from "@/lib/data";
import { getArticleExcerpt, getArticleReadingLabel } from "@/lib/articles";
import { getArticlePublicUrl } from "@/lib/platform-urls";

const fallbackImages = [
  "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80",
];

export default function ArticleCard({ article, index = 0 }) {
  const image = article.cover_image_url || fallbackImages[index % fallbackImages.length];
  const category = localize(article.category, "title", "id") || "Artikel";

  return (
    <article className="article-card">
      <div className="article-card-image">
        <img alt={article.title} src={image} />
      </div>
      <div className="article-card-body">
        <span className="pill">{category}</span>
        <h3>{article.title}</h3>
        <p>{getArticleExcerpt(article)}</p>
        <div className="article-card-meta">
          <span>{article.author?.full_name || "Tim Rabbani Institute"}</span>
          <span>{formatDate(article.published_at || article.created_at)}</span>
          <span>{getArticleReadingLabel(article)}</span>
        </div>
        <Link className="button secondary" href={getArticlePublicUrl(article.slug)}>
          Baca artikel
        </Link>
      </div>
    </article>
  );
}
