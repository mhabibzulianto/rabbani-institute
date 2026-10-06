import { ARTICLE_STATUSES, formatArticleDate } from "@/lib/article-list.mjs";
import { getArticlePreview } from "@/lib/article-preview.mjs";
import { formatPublicationTime } from "@/lib/article-workflow.mjs";

export default function ArticlePreviewContent({ article }) {
  const preview = getArticlePreview(article);
  return <>
        <section className="article-preview-metadata" aria-label="Informasi artikel">
          <p className="article-eyebrow">INFORMASI ARTIKEL</p>
          <span className={`article-status article-status-${article.status}`}>{ARTICLE_STATUSES[article.status] || article.status}</span>
          <dl>
            <div><dt>Penulis</dt><dd>{article.author?.full_name || "Penulis tanpa nama"}</dd></div>
            <div><dt>Kategori</dt><dd>{article.category?.title_id || "Belum dikategorikan"}</dd></div>
            <div><dt>Topik</dt><dd>{article.topic || "Belum ditentukan"}</dd></div>
            <div><dt>Dibuat</dt><dd>{formatArticleDate(article.created_at)}</dd></div>
            <div><dt>Diperbarui</dt><dd>{formatArticleDate(article.updated_at)}</dd></div>
            {article.published_at && <div><dt>Diterbitkan</dt><dd>{formatArticleDate(article.published_at)}</dd></div>}
            {article.scheduled_at && <div><dt>Jadwal publikasi</dt><dd>{formatPublicationTime(article.scheduled_at)}</dd></div>}
            <div><dt>Slug</dt><dd className="article-preview-slug">{article.slug}</dd></div>
          </dl>
          <section className="article-preview-meta-section"><h2>Tag</h2>{article.tags?.length ? <ul className="article-preview-tags">{article.tags.map((tag, index) => <li key={`${tag}-${index}`}>{tag}</li>)}</ul> : <p>Belum ada tag</p>}</section>
          {article.admin_note && <section className="article-preview-meta-section"><h2>Catatan redaksi</h2><p>{article.admin_note}</p></section>}
        </section>
        <article className="article-preview-paper" aria-label="Isi preview artikel">
          <header className="article-preview-heading">
            <p className="article-eyebrow">{article.category?.title_id || "RABBANI INSTITUTE"}</p>
            <h1>{article.title}</h1>
            {article.excerpt && <p className="article-preview-excerpt">{article.excerpt}</p>}
            <p className="article-preview-byline">{article.author?.full_name || "Penulis tanpa nama"}<span aria-hidden="true"> · </span>{formatArticleDate(article.published_at || article.created_at)}</p>
          </header>
          {preview.coverHtml && <div className="article-preview-cover" dangerouslySetInnerHTML={{ __html: preview.coverHtml }} />}
          {preview.hasContent ? <div className="article-preview-prose" dangerouslySetInnerHTML={{ __html: preview.html }} /> : <div className="article-preview-no-content"><h2>Isi artikel belum ditulis</h2><p>Judul dan informasi artikel sudah tersimpan. Isi tulisan akan muncul di sini setelah ditambahkan.</p></div>}
        </article>

  </>;
}

