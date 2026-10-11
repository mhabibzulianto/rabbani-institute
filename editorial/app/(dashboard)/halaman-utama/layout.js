import { requireLandingAdmin } from "@/lib/editorial";

export default async function LandingAdminLayout({ children }) {
  await requireLandingAdmin();
  return children;
}
