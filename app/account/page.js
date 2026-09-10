import { redirect } from "next/navigation";
import AccountAuthShell from "@/components/account/AccountAuthShell";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/sso";

export default async function AccountRootPage({ searchParams }) {
  const params = await searchParams;
  const next = getSafeRedirect(params?.next || "/profile", "/profile");
  const { user } = await getCurrentUser();

  if (user) {
    redirect(next);
  }

  return <AccountAuthShell next={next} />;
}
