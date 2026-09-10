import PageHeader from "@/components/PageHeader";
import { formatDate, getPublishedArticles } from "@/lib/madrasah";

export default async function JelajahPage() {
  const articles = await getPublishedArticles();

  return (
    <main className="page-shell">
      <PageHeader
        title="Jelajah"
        description="Daftar artikel dan publikasi yang disediakan proyek utama Rabbani Institute."
      />

      <section className="article-grid">
        {articles.length === 0 ? (
          <div className="placeholder-panel">
            <h2>Belum ada publikasi</h2>
            <p>Konten jelajah akan muncul di sini setelah disediakan dari proyek induk.</p>
          </div>
        ) : articles.map((article) => (
          <article className="article-card" key={article.id}>
            <div className="article-meta">
              <span>{article.topic || "Artikel"}</span>
              <span>{formatDate(article.published_at)}</span>
            </div>
            <h2>{article.title || "Tanpa judul"}</h2>
            <p>{article.excerpt || "Publikasi Rabbani Institute."}</p>
            <div className="article-footer">
              <span>{article.author?.full_name || "Rabbani Institute"}</span>
              <span className="article-badge">Tersedia</span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
