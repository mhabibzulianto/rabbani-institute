export default function PublicationPreview({ preview, author, category, date }) {
  return <article className="publication-preview">
    <header><p className="publication-category">{category || "RABBANI INSTITUTE"}</p><h1>{preview.title}</h1>{preview.excerpt && <p className="publication-excerpt">{preview.excerpt}</p>}<p className="publication-byline">{author || "Tim Rabbani Institute"}{date && <> · {date}</>}</p></header>
    {preview.coverHtml && <div className="publication-cover" dangerouslySetInnerHTML={{ __html: preview.coverHtml }} />}
    {preview.hasContent ? <div className="publication-prose" dangerouslySetInnerHTML={{ __html: preview.html }} /> : <p className="publication-empty">Isi artikel belum ditulis.</p>}
  </article>;
}
