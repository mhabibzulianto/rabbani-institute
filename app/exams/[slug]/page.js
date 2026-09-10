import { notFound } from "next/navigation";
import ExamPortal from "@/components/ExamPortal";
import { getPublicExamModuleBySlug } from "@/lib/exams";

export default async function ExamDetailPage({ params }) {
  const { slug } = await params;
  const { schemaReady, exam } = await getPublicExamModuleBySlug(slug);

  if (!schemaReady) {
    return (
      <main className="page">
        <section className="panel">
          <h1>Schema modul ujian belum aktif</h1>
          <p>Jalankan patch SQL modul ujian dulu agar portal peserta bisa dipakai.</p>
        </section>
      </main>
    );
  }

  if (!exam) {
    notFound();
  }

  return (
    <main className="page">
      <ExamPortal exam={exam} />
    </main>
  );
}
