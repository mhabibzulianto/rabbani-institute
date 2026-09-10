import Link from "next/link";
import SearchForm from "@/components/SearchForm";
import { searchSite } from "@/lib/site-search";

export const metadata = {
  title: "Pencarian",
  description: "Cari kelas, artikel, FAQ, kebijakan, dan halaman publik Rabbani Institute.",
};

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = params?.q?.toString() || "";
  const { results, total } = await searchSite(query);

  return (
    <main className="page">
      <section className="policy-hero">
        <p className="section-label">Pencarian</p>
        <h1>Cari kelas, artikel, FAQ, dan halaman penting</h1>
        <p className="policy-intro">
          Gunakan pencarian untuk menemukan course, artikel, jawaban cepat, atau dokumen kebijakan yang kamu butuhkan.
        </p>
      </section>

      <section className="panel search-shell">
        <SearchForm defaultValue={query} />
        {query ? (
          <p className="muted-line">Ditemukan {total} hasil untuk &ldquo;{query}&rdquo;.</p>
        ) : (
          <p className="muted-line">Masukkan kata kunci untuk mulai mencari.</p>
        )}
      </section>

      <section className="search-results">
        {query && results.length === 0 ? (
          <article className="panel">
            <h2>Tidak ada hasil yang cocok</h2>
            <p>Coba kata kunci yang lebih singkat atau istilah yang lebih umum.</p>
          </article>
        ) : null}

        {results.map((result) => (
          <Link className="panel search-result-card" href={result.url} key={`${result.type}-${result.url}-${result.title}`}>
            <span className="pill">{result.type}</span>
            <h2>{result.title}</h2>
            <p>{result.excerpt}</p>
            <span className="search-result-link">{result.url}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
