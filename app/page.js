import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AccountAuthShell from "@/components/account/AccountAuthShell";
import LandingPage from "@/components/LandingPage";
import { getPublishedLanding } from "@/lib/landing";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/sso";
import { landingMetadata } from "../packages/landing-page/publication.mjs";
export const revalidate = 300;
export async function generateMetadata() {
  const host = (await headers()).get("host")?.split(":")[0]?.toLowerCase();
  if (host === (process.env.NEXT_PUBLIC_ACCOUNT_HOST || "account.rabbaniinstitute.id").toLowerCase()) return { title: "Akun Rabbani Institute" };
  return landingMetadata(await getPublishedLanding(), process.env.LANDING_CANONICAL_ORIGIN || "https://www.rabbaniinstitute.id");
}
export default async function HomePage({ searchParams }) {
  const headerStore = await headers();
  const host = headerStore.get("host")?.split(":")[0]?.toLowerCase() || "";
  const accountHost = (process.env.NEXT_PUBLIC_ACCOUNT_HOST || "account.rabbaniinstitute.id").toLowerCase();

  if (host === accountHost) {
    const params = await searchParams;
    const next = getSafeRedirect(params?.next || "/profile", "/profile");
    const { user } = await getCurrentUser();

    if (user) {
      redirect(next);
    }

    return <AccountAuthShell next={next} />;
  }

  return <LandingPage document={await getPublishedLanding()} />;
}
