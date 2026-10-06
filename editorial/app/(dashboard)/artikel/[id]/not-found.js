import Link from "next/link";

export default function ArticleNotFound() {
  return <main className="page-shell"><section className="article-list-panel article-empty"><h1>Artikel tidak ditemukan</h1><p>Artikel mungkin sudah dihapus atau Anda tidak memiliki akses.</p><Link href="/artikel" className="secondary-button">Kembali ke artikel</Link></section></main>;
}
