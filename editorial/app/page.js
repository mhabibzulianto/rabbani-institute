import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import AuthCard from "@/components/AuthCard";
import { getSafeRedirect } from "@/lib/auth";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const next = getSafeRedirect(params?.next || "/beranda");
  const { user } = await getCurrentUser();

  if (user) {
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
