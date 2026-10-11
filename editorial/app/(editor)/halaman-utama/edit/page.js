import LandingEditor from "@/components/landing/LandingEditor";
import { requireLandingAdmin } from "@/lib/editorial";
import { getLandingPageForAdmin } from "@/lib/landing-pages";

export const metadata = { title: "Editor halaman utama" };
export default async function LandingEditorPage() {
  const { user } = await requireLandingAdmin();
  const initial = await getLandingPageForAdmin();
  return <LandingEditor initial={initial} userId={user.id} />;
}
