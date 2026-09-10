import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForms from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/supabase/server";
import { normalizeLanguage } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/sso";

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const next = getSafeRedirect(params?.next || "https://madrasah.rabbaniinstitute.id/beranda");

  if (params?.method === "whatsapp") {
    const accountCenterUrl = process.env.NEXT_PUBLIC_ACCOUNT_CENTER_URL || "https://account.rabbaniinstitute.id/";
    redirect(`${accountCenterUrl.replace(/\/$/, "")}/auth/register?method=whatsapp&next=${encodeURIComponent(next)}`);
  }

  const cookieStore = await cookies();
  const { user, profile } = await getCurrentUser();
  const language = normalizeLanguage(profile?.preferred_language || cookieStore.get("rabbani-language")?.value);

  if (user) {
    redirect(next);
  }

  return (
    <main className="page">
      <section className="auth-shell">
        <div className="section-heading auth-heading">
          <p className="section-label">Register</p>
          <h1>Buat akun Rabbani</h1>
          <p>Daftarkan akun baru dengan email atau nomor WhatsApp untuk belajar di seluruh project Rabbani Institute.</p>
        </div>
        <AuthForms
          mode="register"
          next={next}
          language={language}
          error={params?.error}
          message={params?.message}
          identifier={params?.identifier || params?.email || ""}
          method={params?.method || "email"}
        />
      </section>
    </main>
  );
}
