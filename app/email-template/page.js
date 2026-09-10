import RabbaniEmailTemplate from "@/components/email/RabbaniEmailTemplate";

export const metadata = {
  title: "Email Template | rabbani-institute",
  description: "Preview template email Rabbani Institute.",
};

export default function EmailTemplatePage() {
  return (
    <main className="page">
      <section className="section-heading">
        <p className="section-label">Preview email</p>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.4rem)", lineHeight: 1.02 }}>
          Template email rabbani-institute
        </h1>
        <p>
          Desain ini mengikuti bahasa visual website: biru utama, aksen emas, panel putih, dan struktur yang tenang
          untuk pengumuman, onboarding, maupun notifikasi akun.
        </p>
      </section>

      <div
        style={{
          overflowX: "auto",
          border: "1px solid var(--line)",
          borderRadius: "8px",
          background: "var(--paper)",
          boxShadow: "var(--shadow)",
          padding: "24px",
        }}
      >
        <div style={{ minWidth: "680px" }}>
          <RabbaniEmailTemplate
            previewText="Akses kelas terbaru dan lanjutkan progres belajar Anda bersama rabbani-institute."
            eyebrow="Email template"
            title="Selamat datang di ruang belajar rabbani-institute"
            lead="Template ini bisa dipakai untuk email onboarding, pengumuman kelas baru, konfirmasi akun, atau update progres belajar."
            bodyTitle="Desain email yang konsisten dengan website"
            body="Strukturnya dibuat ringan dan kompatibel untuk email HTML: layout berbasis tabel, gaya visual inline, dan hirarki konten yang tetap jelas di berbagai klien email."
            highlightLabel="Kapan dipakai"
            highlight="Gunakan varian ini untuk welcome email, notifikasi enrolment, email verifikasi, pengumuman batch baru, dan reminder agar siswa kembali melanjutkan belajar."
            ctaLabel="Lihat katalog kelas"
            ctaHref="https://rabbani-institute.id/courses"
            secondaryCtaLabel="Masuk ke studio"
            secondaryCtaHref="https://rabbani-institute.id/studio"
            footerNote="Versi preview ini dibuat dari komponen reusable sehingga bisa langsung dipakai saat integrasi dengan layanan email."
          />
        </div>
      </div>
    </main>
  );
}
