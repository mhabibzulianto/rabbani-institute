import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { getCurrentUser } from "@/lib/supabase/server";
import { canAccessEditorial } from "@/lib/access.mjs";

export const metadata = { title: "Akses Editorial" };

export default async function AccessDeniedPage() {
  const { user, profile } = await getCurrentUser();
  if (!user) redirect("/auth");
  if (canAccessEditorial(profile)) redirect("/beranda");

  return (
    <AuthShell>
      <div className="editorial-auth-heading">
        <h2>Akses Editorial belum tersedia</h2>
        <p>Akun Anda belum memiliki izin penulis. Hubungi administrator untuk mendapatkan akses.</p>
      </div>
      <p className="editorial-auth-helper">
        <Link href="/auth/logout">Keluar dan gunakan akun lain</Link>
      </p>
    </AuthShell>
  );
}
