import Link from "next/link";
import { notFound } from "next/navigation";
import { getEditorialArticle } from "@/lib/articles";
import { getArticlePreview } from "@/lib/article-preview.mjs";
import { formatArticleDate } from "@/lib/article-list.mjs";
import PublicationPreview from "@/components/PublicationPreview";

export const metadata = { title: "Preview publik artikel", robots: { index: false, follow: false } };
export default async function ArticlePublicationPreview({ params }) {
  const { id } = await params;
  const { article } = await getEditorialArticle(id);
  if (!article) notFound();
  return <div className="publication-page"><nav className="publication-preview-nav"><Link href={`/artikel/${id}/edit`}>← Kembali ke editor</Link><span>Preview publik · versi tersimpan</span></nav><PublicationPreview preview={{ ...getArticlePreview(article), title: article.title, excerpt: article.excerpt }} author={article.author?.full_name} category={article.category?.title_id} date={formatArticleDate(article.published_at || article.created_at)} /></div>;
}
