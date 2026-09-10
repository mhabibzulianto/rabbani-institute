import AuthCard from "@/components/AuthCard";
import AuthShell from "@/components/AuthShell";
import { getSafeRedirect } from "@/lib/auth";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const next = getSafeRedirect(params?.next || "/beranda");

  return (
    <AuthShell>
      <AuthCard
        mode="reset-password"
        next={next}
        error={params?.error}
        message={params?.message}
      />
    </AuthShell>
  );
}
