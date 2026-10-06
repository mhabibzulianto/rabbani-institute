"use client";

export default function ArticleError({ reset }) {
  return <section className="article-list-panel article-empty" role="alert"><h2>Artikel belum dapat dimuat</h2><p>Koneksi sedang bermasalah. Coba muat ulang halaman.</p><button type="button" className="secondary-button" onClick={reset}>Coba lagi</button></section>;
}
