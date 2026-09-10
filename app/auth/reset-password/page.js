import { cookies } from "next/headers";
import AuthForms from "@/components/AuthForms";
import { normalizeLanguage } from "@/lib/i18n";
import { getSafeRedirect } from "@/lib/sso";

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("rabbani-language")?.value);
  const next = getSafeRedirect(params?.next || "https://madrasah.rabbaniinstitute.id/beranda");

  return (
    <main className="page">
      <section className="auth-shell">
        <div className="section-heading auth-heading">
          <p className="section-label">Reset password</p>
          <h1>Buat password baru</h1>
          <p>Setelah disimpan, kamu bisa langsung masuk kembali dengan password yang baru.</p>
        </div>
        <AuthForms
          mode="reset-password"
          next={next}
          language={language}
          error={params?.error}
          message={params?.message}
        />
      </section>
    </main>
  );
}
