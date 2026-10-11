import PageHeader from "@/components/PageHeader";
import Link from "next/link";
import { getLandingPageForAdmin } from "@/lib/landing-pages";
import LandingPublicationStatus from "@/components/landing/LandingPublicationStatus";

export default async function HalamanUtamaPage() {
  const landing = await getLandingPageForAdmin();
  return (
    <main className="page-shell">
      <PageHeader badge="SETTING" title="Halaman utama" description="Kelola landing page situs utama Rabbani Institute." actions={<Link className="primary-button" href="/halaman-utama/edit">Buka editor</Link>} />
      <section className="placeholder-panel">
        <h2>Draft landing page</h2>
        <LandingPublicationStatus published={landing.published} />
        <p><Link className="secondary-button" href="/halaman-utama/riwayat">Riwayat revisi</Link></p>
        <p>{landing.schemaReady ? `Draft tersedia · versi ${landing.version}` : "Dokumen default tersedia. Jalankan landing_page_editor_patch.sql di Supabase untuk mengaktifkan penyimpanan draft."}</p>
        <p>Akses pengelolaan hanya tersedia bagi admin. Susun blok dan simpan perubahan melalui editor visual.</p>
        <ol>{landing.document.blocks.map((block) => <li key={block.id}>{block.props.title} <small>({block.type})</small></li>)}</ol>
        <p>Buka Preview situs di editor untuk memeriksa draft dengan data publik dan tampilan desktop/mobile. Situs publik hanya menampilkan snapshot terbit atau dokumen default; perubahan draft tetap privat.</p>
      </section>
    </main>
  );
}
