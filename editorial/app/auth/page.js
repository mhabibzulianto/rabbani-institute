import { redirect } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import AuthShell from "@/components/AuthShell";
import { getSafeRedirect } from "@/lib/auth";
import { getCurrentUser } from "@/lib/supabase/server";
import { canAccessEditorial } from "@/lib/access.mjs";

export default async function AuthPage({ searchParams }) {
  const params = await searchParams;
  const next = getSafeRedirect(params?.next || "/beranda");
  const { user, profile } = await getCurrentUser();

  if (user) {
    if (!canAccessEditorial(profile)) redirect("/akses-ditolak");
    redirect(next);
  }

  return (
    <AuthShell>
      <AuthCard
        mode="login"
        next={next}
        error={params?.error}
        message={params?.message}
        identifier={params?.identifier || params?.email || ""}
      />
    </AuthShell>
  );
}
