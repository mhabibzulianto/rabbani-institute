import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { touchEditorialMembership } from "@/lib/editorial";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }) {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/auth?next=/beranda");
  }

  await touchEditorialMembership(user.id);

  return <AppShell profile={profile}>{children}</AppShell>;
}
