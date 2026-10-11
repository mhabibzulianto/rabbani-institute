import LandingPage from "@/components/LandingPage";
import { getLandingPreview } from "@/lib/landing-preview";
export const dynamic = "force-dynamic";
export const metadata = { title: "Preview draft", robots: { index: false, follow: false } };
export default async function PreviewCanvas() {
  const document = await getLandingPreview();
  if (!document) return <main className="section"><h1>Preview tidak tersedia</h1><p>Sesi telah berakhir. Buka preview baru dari editor.</p></main>;
  return <LandingPage document={document} />;
}
