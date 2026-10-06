import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireEditorialUser } from "@/lib/editorial";
import { createArticleDraft } from "../actions";
import ArticleSubmitButton from "@/components/ArticleSubmitButton";

export const metadata = { title: "Artikel baru" };

export default async function NewArticlePage({ searchParams }) {
  await requireEditorialUser();
  const params = await searchParams;
  return <main className="page-shell article-workspace">
    <Link className="article-back-link" href="/artikel"><ArrowLeft size={16} aria-hidden="true" />Kembali ke artikel</Link>
    <header className="article-page-heading"><div><p className="article-eyebrow">DRAFT BARU</p><h1>Mulai sebuah tulisan</h1><p className="page-description">Beri judul dan ringkasan awal sebagai titik awal tulisan Anda. Editor isi artikel belum tersedia.</p></div></header>
    <section className="article-draft-panel">
      {params?.error && <p className="notice error" role="alert">{params.error === "validation" ? "Isi judul maksimal 200 karakter dan ringkasan maksimal 500 karakter." : "Draft belum tersimpan. Periksa koneksi dan izin akun, lalu coba lagi."}</p>}
      <form action={createArticleDraft} className="article-draft-form">
        <label><span>Judul artikel <span aria-hidden="true">*</span></span><input type="text" name="title" required maxLength={200} placeholder="Apa yang ingin Anda tulis?" defaultValue={typeof params?.title === "string" ? params.title : ""} autoFocus /></label>
        <label><span>Ringkasan <small>Opsional</small></span><textarea name="excerpt" maxLength={500} rows={4} placeholder="Gambaran singkat tentang artikel ini…" defaultValue={typeof params?.excerpt === "string" ? params.excerpt : ""} /><small>Maksimal 500 karakter. Ringkasan bisa diperbarui nanti.</small></label>
        <div className="article-draft-footer"><p>Artikel dibuat sebagai draft milik akun Anda.</p><ArticleSubmitButton /></div>
      </form>
    </section>
  </main>;
}
