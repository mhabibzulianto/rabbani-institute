import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { formatDate, getCourseBySlugForUser } from "@/lib/madrasah";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function KelasDetailPage({ params }) {
  const { slug } = await params;
  const { user } = await getCurrentUser();
  const enrollment = await getCourseBySlugForUser(user.id, slug);

  if (!enrollment?.course) {
    notFound();
  }

  const course = enrollment.course;

  return (
    <main className="page-shell">
      <PageHeader
        badge="KELASKU"
        title={course.title_id || "Detail kelas"}
        description={course.short_description_id || "Ringkasan kelas yang sedang Anda ikuti."}
      />

      <section className="panel-grid two-up">
        <article className="panel-card">
          <h2>Ringkasan kelas</h2>
          <div className="detail-grid">
            <div className="detail-row"><span>Status enroll</span><strong>{enrollment.status || "-"}</strong></div>
            <div className="detail-row"><span>Tanggal gabung</span><strong>{formatDate(enrollment.enrolled_at)}</strong></div>
            <div className="detail-row"><span>Mulai</span><strong>{formatDate(course.starts_at)}</strong></div>
            <div className="detail-row"><span>Selesai</span><strong>{formatDate(course.ends_at)}</strong></div>
            <div className="detail-row"><span>Durasi</span><strong>{course.duration_weeks ? `${course.duration_weeks} minggu` : "-"}</strong></div>
            <div className="detail-row"><span>Jumlah sesi</span><strong>{course.session_count || "-"}</strong></div>
          </div>
        </article>

        <article className="panel-card">
          <h2>Catatan</h2>
          <p className="muted-copy">
            Halaman detail kelas masih dibuat sederhana untuk tahap awal. Saat modul kelas Madrasah diperluas,
            area ini bisa dihubungkan ke jadwal sinkron, materi, tugas, dan rekaman sesi.
          </p>
        </article>
      </section>
    </main>
  );
}
