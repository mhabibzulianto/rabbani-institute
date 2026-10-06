import Link from "next/link";
import Form from "next/form";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowUpRight, ChevronLeft, ChevronRight, FileText, Plus, Search } from "lucide-react";
import { getEditorialArticles, getEditorialArticle } from "@/lib/articles";
import ArticlePreviewWorkspace, { ArticlePreviewLink, ArticlePreviewLoading } from "@/components/ArticlePreviewWorkspace";
import ArticlePreviewContent from "@/components/ArticlePreviewContent";
import PageHeader from "@/components/PageHeader";
import { ARTICLE_STATUSES, ARTICLE_PAGE_SIZE, articleListHref, formatArticleDate } from "@/lib/article-list.mjs";

export const metadata = { title: "Artikel" };

async function LoadedArticlePreview({ id, created }) {
  let article;
  try {
    ({ article } = await getEditorialArticle(id));
  } catch (error) {
    // Keep authentication redirects intact; isolate database failures to the panel.
    if (!error.cause) throw error;
    return <div className="article-preview-no-content"><h2>Preview belum dapat dimuat</h2><p>Tutup preview lalu buka kembali untuk mencoba lagi.</p></div>;
  }
  return <>
    {created && <p className="article-inline-notice" role="status">Draft berhasil dibuat dan tersimpan.</p>}
    {article ? <ArticlePreviewContent article={article} /> : <div className="article-preview-no-content"><h2>Artikel tidak ditemukan</h2><p>Artikel tidak tersedia atau Anda tidak memiliki akses.</p></div>}
  </>;
}

export default async function ArtikelPage({ searchParams }) {
  const query = await searchParams;
  const result = await getEditorialArticles(query);
  if (result.redirectPage) redirect(articleListHref(result.filters, { page: result.redirectPage }));
  const { articles, filters, total, pages, categories, authors, admin, error, optionsError } = result;
  const closeHref = articleListHref(filters);
  const previewId = typeof query?.preview === "string" ? query.preview : "";
  const previewHref = (id) => `${closeHref}${closeHref.includes("?") ? "&" : "?"}preview=${id}`;
  const filtered = [filters.q, filters.status, filters.author, filters.category, filters.from, filters.until].some(Boolean);
  return (
    <ArticlePreviewWorkspace previewId={previewId} closeHref={closeHref} preview={previewId ? <Suspense key={previewId} fallback={<ArticlePreviewLoading />}><LoadedArticlePreview id={previewId} created={query?.created === "1"} /></Suspense> : null}>
    <main className="page-shell article-workspace">
      <PageHeader
        badge="RUANG REDAKSI"
        title="Artikel"
        description={admin ? "Kelola tulisan dan pantau antrean seluruh penulis." : "Ruang untuk draft, tulisan yang diajukan, dan artikel Anda yang sudah terbit."}
        actions={<Link href="/artikel/baru" className="primary-button"><Plus size={17} aria-hidden="true" />Artikel baru</Link>}
      />

      <section className="article-list-panel" aria-label="Daftar artikel">
        <nav className="article-status-tabs" aria-label="Filter status artikel">
          <Link href={articleListHref(filters, { status: "", page: 1 })} aria-current={!filters.status ? "page" : undefined}>Semua artikel</Link>
          {Object.entries(ARTICLE_STATUSES).map(([value, label]) => <Link key={value} href={articleListHref(filters, { status: value, page: 1 })} aria-current={filters.status === value ? "page" : undefined}>{label}</Link>)}
        </nav>
        <Form key={articleListHref(filters)} action="/artikel" className="article-filter-form">
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          <label className="article-search"><span>Cari judul</span><div><Search size={17} aria-hidden="true" /><input name="q" defaultValue={filters.q} placeholder="Cari artikel…" maxLength={120} type="search" /></div></label>
          {admin && <label><span>Penulis</span><select name="author" defaultValue={filters.author}><option value="">Semua penulis</option>{authors.map((author) => <option key={author.id} value={author.id}>{author.full_name || "Penulis tanpa nama"}</option>)}</select></label>}
          <label><span>Kategori</span><select name="category" defaultValue={filters.category}><option value="">Semua kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.title_id}</option>)}</select></label>
          <label><span>Dibuat sejak</span><input type="date" name="from" defaultValue={filters.from} max={filters.until || undefined} /></label>
          <label><span>Sampai</span><input type="date" name="until" defaultValue={filters.until} min={filters.from || undefined} /></label>
          <div className="article-filter-actions"><button className="secondary-button" type="submit">Terapkan</button>{filtered && <Link href="/artikel" className="article-text-link">Reset</Link>}</div>
        </Form>
        {optionsError && <p className="article-inline-notice" role="status">Sebagian pilihan filter belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.</p>}

        {error ? <div className="article-empty" role="alert"><FileText size={32} aria-hidden="true" /><h2>Daftar artikel belum dapat dimuat</h2><p>Periksa koneksi dan pastikan tabel artikel tersedia di Supabase.</p><Link className="secondary-button" href={articleListHref(filters)}>Coba lagi</Link></div> : articles.length === 0 ? <div className="article-empty"><FileText size={34} aria-hidden="true" /><h2>{filtered ? "Tidak ada artikel yang cocok" : "Tulisan pertama dimulai di sini"}</h2><p>{filtered ? "Coba kata kunci lain atau longgarkan filter pencarian." : "Buat draft untuk mulai menyusun artikel baru. Draft tersimpan hanya untuk Anda dan tim redaksi."}</p><Link href={filtered ? "/artikel" : "/artikel/baru"} className={filtered ? "secondary-button" : "primary-button"}>{filtered ? "Hapus filter" : "Buat artikel pertama"}</Link></div> : <>
          <div className="article-result-count" role="status"><span><strong>{total.toLocaleString("id-ID")}</strong> artikel{filtered ? " ditemukan" : " dalam ruang kerja"}</span><span>Terakhir diperbarui</span></div>
          <div className="article-table-scroll" tabIndex={0} role="region" aria-label="Tabel artikel, gulir ke kanan untuk melihat semua kolom">
            <table className="article-data-table"><caption className="visually-hidden">Daftar artikel {admin ? "seluruh penulis" : "milik Anda"}</caption><thead><tr><th scope="col">Judul artikel</th><th scope="col">Status</th><th scope="col">Penulis</th><th scope="col">Kategori</th><th scope="col">Diperbarui</th><th scope="col"><span className="visually-hidden">Buka artikel</span></th></tr></thead>
              <tbody>{articles.map((article) => <tr key={article.id}>
                <td><ArticlePreviewLink articleId={article.id} href={previewHref(article.id)} className="article-title-link">{article.title || "Tanpa judul"}</ArticlePreviewLink><p className="article-row-excerpt">{article.excerpt || `/${article.slug}`}</p></td>
                <td><span className={`article-status article-status-${article.status}`}>{ARTICLE_STATUSES[article.status] || article.status}</span></td>
                <td>{article.author?.full_name || "Penulis tanpa nama"}</td><td>{article.category?.title_id || "Belum dikategorikan"}</td>
                <td><time dateTime={article.updated_at}>{formatArticleDate(article.updated_at)}</time></td>
                <td><ArticlePreviewLink articleId={article.id} href={previewHref(article.id)} className="article-open-link" aria-label={`Preview artikel ${article.title}`}><ArrowUpRight size={19} aria-hidden="true" /></ArticlePreviewLink></td>
              </tr>)}</tbody>
            </table>
          </div>
          <footer className="article-pagination"><p>Menampilkan {(filters.page - 1) * ARTICLE_PAGE_SIZE + 1}–{Math.min(filters.page * ARTICLE_PAGE_SIZE, total)} dari {total.toLocaleString("id-ID")} artikel</p><nav aria-label="Halaman daftar artikel">
            {filters.page > 1 ? <Link className="secondary-button" href={articleListHref(filters, { page: filters.page - 1 })} aria-label="Halaman sebelumnya"><ChevronLeft size={16} aria-hidden="true" /></Link> : <span className="article-disabled-page" aria-disabled="true"><ChevronLeft size={16} aria-hidden="true" /></span>}
            <span>Halaman {filters.page} dari {pages}</span>
            {filters.page < pages ? <Link className="secondary-button" href={articleListHref(filters, { page: filters.page + 1 })} aria-label="Halaman berikutnya"><ChevronRight size={16} aria-hidden="true" /></Link> : <span className="article-disabled-page" aria-disabled="true"><ChevronRight size={16} aria-hidden="true" /></span>}
          </nav></footer>
        </>}
      </section>
      <p className="article-scope-note">{admin ? "Anda melihat artikel seluruh penulis." : "Hanya artikel milik Anda yang ditampilkan."} Tanggal ditampilkan dalam zona waktu Jakarta (UTC+7).</p>
    </main>
    </ArticlePreviewWorkspace>
  );
}
