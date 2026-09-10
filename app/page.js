import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import AccountAuthShell from "@/components/account/AccountAuthShell";
import CourseCard from "@/components/CourseCard";
import { getPublishedCoursesPublic } from "@/lib/data";
import ArticleCard from "@/components/ArticleCard";
import { getPublishedArticlesPublic } from "@/lib/articles";
import { getPublishedExamModules } from "@/lib/exams";
import { formatExamWindow, minutesToExamDurationLabel } from "@/lib/exam-utils";
import { hasMidtransServerKey } from "@/lib/payments";
import { platformUrls } from "@/lib/platform-urls";
import { getCurrentUser } from "@/lib/supabase/server";
import { getSafeRedirect } from "@/lib/sso";

export const revalidate = 300;

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

  const [courses, exams, articles] = await Promise.all([
    getPublishedCoursesPublic(),
    getPublishedExamModules(),
    getPublishedArticlesPublic(3),
  ]);
  const paymentReady = hasMidtransServerKey();

  return (
    <main className="landing-page">
      <section className="hero hero-home" id="beranda">
        <div className="hero-shell">
          <div className="hero-copy hero-copy-home">
            <p className="eyebrow">Platform belajar online</p>
            <h1>Al-Qur&apos;an dan Bahasa Arab</h1>
            <p>
              Rabbani Institute menghadirkan kelas keislaman, Bahasa Arab, dan kajian bertahap dalam satu ruang belajar
              yang rapi, tenang, dan mudah diikuti dari mana saja.
            </p>
            <div className="hero-actions">
              <Link className="button primary" href={platformUrls.classesHome}>
                Mulai belajar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-about" id="tentang">
        <div className="section-heading">
          <p className="section-label">Tentang platform</p>
          <h2>Ekosistem belajar yang terasa tenang dan fokus</h2>
          <p>Kurikulum, evaluasi, dan bahan pendukungnya kami rapikan supaya peserta tinggal belajar dengan lebih nyaman.</p>
        </div>
        <div className="landing-feature-grid">
          <article className="panel landing-feature-card">
            <strong>2 kategori utama</strong>
            <p>Bahasa Arab dan Ulumul Qur&apos;an kami susun sebagai fondasi perjalanan belajar awal.</p>
          </article>
          <article className="panel landing-feature-card">
            <strong>2 model kelas</strong>
            <p>Kelas Mandiri dan Kelas Madrasah berjalan berdampingan tanpa memecah pengalaman peserta.</p>
          </article>
          <article className="panel landing-feature-card">
            <strong>{paymentReady ? "Checkout aktif" : "SSO siap"}</strong>
            <p>
              {paymentReady
                ? "Pembayaran kelas berbayar sudah aktif lewat Midtrans Snap."
                : "Pintu masuk akun bersama Rabbani siap dipakai saat dibutuhkan."}
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="kelas">
        <div className="section-heading">
          <p className="section-label">Katalog kelas</p>
          <h2>Kelas unggulan</h2>
          <p>Pilih kelas, daftar, lalu simpan progress belajar langsung di Supabase.</p>
        </div>
        <div className="course-grid">
          {courses.slice(0, 3).map((course, index) => (
            <CourseCard key={course.id} course={course} language="id" index={index} />
          ))}
        </div>
        <div className="landing-section-actions">
          <Link className="button secondary" href={platformUrls.classesHome}>
            Lihat semua kelas
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="section-label">Modul ujian</p>
          <h2>Ujian yang tersedia</h2>
          <p>Akses ujian mandiri dan ujian susulan dengan OTP WhatsApp, timer, dan batas attempt yang sudah diatur.</p>
        </div>
        <div className="course-grid">
          {exams.length === 0 ? (
            <article className="panel">
              <p>Belum ada modul ujian yang dibuka saat ini.</p>
              <Link className="button primary" href="/exams">
                Lihat halaman ujian
              </Link>
            </article>
          ) : null}

          {exams.slice(0, 3).map((exam) => (
            <article className="panel" key={exam.id}>
              <p className="section-label">Ujian</p>
              <h3>{exam.title}</h3>
              <p>{exam.subtitle || "Modul ujian terpisah dari course reguler dengan verifikasi OTP WhatsApp."}</p>
              <p className="muted-line">{formatExamWindow(exam)}</p>
              <p className="muted-line">
                {minutesToExamDurationLabel(exam.duration_minutes)} - maksimal {exam.max_attempts} attempt
              </p>
              <div className="hero-actions">
                <Link className="button primary" href={`/exams/${exam.slug}`}>
                  Buka ujian
                </Link>
              </div>
            </article>
          ))}
        </div>

        {exams.length > 0 ? (
          <div className="landing-section-actions">
            <Link className="button secondary" href="/exams">
              Lihat semua ujian
            </Link>
          </div>
        ) : null}
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="section-label">Artikel</p>
          <h2>Tulisan terbaru</h2>
          <p>Baca penjelasan, kutipan Arab, dan catatan pembelajaran yang melengkapi kelas-kelas di Rabbani Institute.</p>
        </div>
        <div className="course-grid">
          {articles.length === 0 ? (
            <article className="panel">
              <p>Belum ada artikel yang terbit saat ini.</p>
              <Link className="button primary" href={platformUrls.articleHome}>
                Buka halaman artikel
              </Link>
            </article>
          ) : null}
          {articles.map((article, index) => (
            <ArticleCard article={article} index={index} key={article.id} />
          ))}
        </div>
      </section>

      <section className="section landing-cta-section">
        <div className="landing-cta-shell">
          <div className="landing-cta-badge">
            <Sparkles size={16} strokeWidth={2.2} />
            <span>Mulai perjalanan Anda</span>
          </div>
          <h2>Siap memperdalam pemahaman Al-Qur&apos;an dan Bahasa Arab?</h2>
          <p>
            Bergabunglah dengan ribuan pelajar lainnya dan mulai perjalanan Anda dalam memahami kitab suci dengan
            lebih baik.
          </p>
          <div className="landing-cta-actions">
            <Link className="landing-cta-button landing-cta-button-primary" href={platformUrls.classesHome}>
              <span>Pilih kelas</span>
              <ArrowRight size={18} strokeWidth={2.2} />
            </Link>
            <Link className="landing-cta-button landing-cta-button-secondary" href="/kontak">
              Hubungi kami
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
