import AppShell from "@/components/AppShell";
import { requireEditorialUser, touchEditorialMembership } from "@/lib/editorial";

export default async function DashboardLayout({ children }) {
  const { user, profile } = await requireEditorialUser();

  await touchEditorialMembership(user.id);

  return <AppShell profile={profile}>{children}</AppShell>;
}
