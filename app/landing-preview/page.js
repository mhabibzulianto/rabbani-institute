import LandingPreviewShell from "@/components/LandingPreviewShell";
import { getLandingPreview } from "@/lib/landing-preview";
import "./preview.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Preview landing", robots: { index: false, follow: false } };
export default async function PreviewPage({ searchParams }) {
  const params = await searchParams;
  const ready = params?.ready === "1" && Boolean(await getLandingPreview());
  return <LandingPreviewShell ready={ready} />;
}
