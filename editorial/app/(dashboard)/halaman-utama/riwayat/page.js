import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import LandingHistory from "@/components/landing/LandingHistory";
import { getLandingHistory, getLandingPageForAdmin } from "@/lib/landing-pages";
export const metadata = { title: "Riwayat landing page" };
export default async function LandingHistoryPage({ searchParams }) {
  const params = await searchParams;
  const [landing, history] = await Promise.all([getLandingPageForAdmin(), getLandingHistory(params?.before)]);
  return <main className="page-shell"><PageHeader badge="SETTING" title="Riwayat landing" description="Periksa revisi terbit atau pulihkan sebagai draft baru." actions={<Link className="secondary-button" href="/halaman-utama">Kembali</Link>} /><LandingHistory revisions={history.revisions} version={landing.version} currentRevision={landing.published?.revision} />{history.next && <Link className="secondary-button" href={`/halaman-utama/riwayat?before=${history.next}`}>Revisi sebelumnya</Link>}{params?.before && <p><Link href="/halaman-utama/riwayat">Kembali ke revisi terbaru</Link></p>}</main>;
}
