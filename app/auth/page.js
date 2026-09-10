import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AuthForms from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/supabase/server";
import { getDictionary, normalizeLanguage } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/sso";

export default async function AuthPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const { user, profile } = await getCurrentUser();
  const language = normalizeLanguage(profile?.preferred_language || cookieStore.get("rabbani-language")?.value);
  const t = getDictionary(language);
  const next = getSafeRedirect(params?.next || "https://madrasah.rabbaniinstitute.id/beranda");

  if (user) {
    redirect(next);
  }

  return (
    <main className="page">
      <section className="auth-shell">
        <div className="section-heading auth-heading">
          <p className="section-label">{t.ssoTitle}</p>
          <h1>{t.authTitle}</h1>
          <p>Gunakan email atau nomor WhatsApp yang sama untuk seluruh project di bawah Rabbani Institute.</p>
        </div>
        <AuthForms
          mode="login"
          next={next}
          language={language}
          error={params?.error}
          message={params?.message}
          identifier={params?.identifier || params?.email || ""}
        />
      </section>
    </main>
  );
}
