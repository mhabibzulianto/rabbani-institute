import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticlesPublic } from "@/lib/articles";

export const metadata = {
  title: "Artikel",
  description: "Baca artikel keislaman, Al-Qur'an, dan Bahasa Arab yang diterbitkan tim editorial Rabbani Institute.",
};

export const revalidate = 300;

export default async function ArticlesPage() {
  const articles = await getPublishedArticlesPublic();

  return (
    <main className="page">
      <section className="section-heading">
        <p className="section-label">dari rabbani-institute</p>
        <h1>Artikel</h1>
      </section>

      <section className="course-grid" aria-label="Daftar artikel terbit">
        {articles.length === 0 ? (
          <article className="panel">
            <h2>Belum ada artikel terbit</h2>
            <p>Artikel yang diterbitkan tim editorial akan tampil di sini.</p>
          </article>
        ) : null}
        {articles.map((article, index) => (
          <ArticleCard article={article} index={index} key={article.id} />
        ))}
      </section>
    </main>
  );
}
