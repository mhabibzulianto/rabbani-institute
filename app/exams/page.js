import Link from "next/link";
import { formatExamWindow, minutesToExamDurationLabel } from "@/lib/exam-utils";
import { getPublishedExamModules } from "@/lib/exams";

export default async function ExamsPage() {
  const exams = await getPublishedExamModules();

  return (
    <main className="page">
      <div className="section-heading">
        <p className="section-label">Exams</p>
        <h1>Modul ujian</h1>
        <p>Kumpulan ujian mandiri dan ujian susulan yang berdiri sendiri di luar course reguler.</p>
      </div>

      <section className="course-grid">
        {exams.length === 0 ? (
          <article className="panel">
            <p>Belum ada modul ujian yang dipublikasikan.</p>
          </article>
        ) : null}

        {exams.map((exam) => (
          <article className="panel" key={exam.id}>
            <p className="section-label">Ujian</p>
            <h2>{exam.title}</h2>
            <p>{exam.subtitle || "Modul ujian berdiri sendiri dengan OTP WhatsApp dan timer ujian."}</p>
            <p className="muted-line">{formatExamWindow(exam)}</p>
            <p className="muted-line">
              {minutesToExamDurationLabel(exam.duration_minutes)} - maksimal {exam.max_attempts} attempt
            </p>
            <Link className="button primary" href={`/exams/${exam.slug}`}>
              Buka ujian
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
