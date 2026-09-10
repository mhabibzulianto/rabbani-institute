import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForms from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/supabase/server";
import { normalizeLanguage } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/sso";

export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  const next = getSafeRedirect(params?.next || "https://madrasah.rabbaniinstitute.id/beranda");

  if (params?.method === "whatsapp") {
    const accountCenterUrl = process.env.NEXT_PUBLIC_ACCOUNT_CENTER_URL || "https://account.rabbaniinstitute.id/";
    redirect(`${accountCenterUrl.replace(/\/$/, "")}/auth/forgot-password?method=whatsapp&next=${encodeURIComponent(next)}`);
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
          <p className="section-label">Reset password</p>
          <h1>Lupa password</h1>
          <p>Reset password lewat email atau lewat OTP WhatsApp, sesuai cara akunmu pernah didaftarkan.</p>
        </div>
        <AuthForms
          mode="forgot-password"
          next={next}
          language={language}
          error={params?.error}
          message={params?.context === "registered" ? "" : params?.message}
          info={params?.context === "registered" ? params?.message : ""}
          identifier={params?.identifier || params?.email || ""}
          method={params?.method || "email"}
        />
      </section>
    </main>
  );
}
