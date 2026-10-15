import { Suspense } from "react";
import PageHeader from "@/components/PageHeader";
import ReportCalendar from "@/components/ReportCalendar";
import { getReportCalendar } from "@/lib/report-calendar";
import { getEditorialArticle } from "@/lib/articles";
import ArticlePreviewWorkspace, { ArticlePreviewLoading } from "@/components/ArticlePreviewWorkspace";
import ArticlePreviewContent from "@/components/ArticlePreviewContent";
import { selectedReportDay } from "@/lib/report-calendar.mjs";

async function ReportArticlePreview({ id }) {
  try {
    const { article } = await getEditorialArticle(id);
    return article ? <ArticlePreviewContent article={article} /> : <div className="article-preview-no-content"><h2>Artikel tidak tersedia</h2><p>Artikel tidak ditemukan atau Anda tidak memiliki akses.</p></div>;
  } catch (error) {
    if (!error.cause) throw error;
    return <div className="article-preview-no-content"><h2>Preview belum dapat dimuat</h2><p>Tutup preview lalu coba lagi.</p></div>;
  }
}
export default async function EditorialBerandaPage({ searchParams }) {
  const query = await searchParams;
  const report = await getReportCalendar(query?.month);
  const day = selectedReportDay(query?.day, report.month, report.today);
  const previewId = typeof query?.preview === "string" && /^[1-9]\d{0,18}$/.test(query.preview) ? query.preview : "";
  const closeHref = "/beranda?" + new URLSearchParams({ month: report.month, day });
  return <ArticlePreviewWorkspace previewId={previewId} closeHref={closeHref} preview={previewId ? <Suspense key={previewId} fallback={<ArticlePreviewLoading />}><ReportArticlePreview id={previewId} /></Suspense> : null}>
    <main className="page-shell"><PageHeader badge="EDITORIAL" title="Beranda" description="Pantau publikasi, jadwal terbit, dan pengajuan artikel dalam kalender laporan." />
      <ReportCalendar key={report.month} report={report} initialDay={day} />
    </main>
  </ArticlePreviewWorkspace>;
}
