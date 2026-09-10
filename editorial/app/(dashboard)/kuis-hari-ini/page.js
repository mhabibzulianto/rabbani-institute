import PageHeader from "@/components/PageHeader";
import { getTodayQuizSummary } from "@/lib/madrasah";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function KuisHariIniPage() {
  const { user } = await getCurrentUser();
  const latestAttempts = await getTodayQuizSummary(user.id);

  return (
    <main className="page-shell">
      <PageHeader
        title="Kuis hari ini"
        description="Area ini masih dikosongkan. Riwayat attempt terbaru tetap ditampilkan sebagai konteks awal."
      />

      <section className="panel-card">
        {latestAttempts.length === 0 ? (
          <p className="empty-copy">Belum ada data kuis yang perlu ditampilkan hari ini.</p>
        ) : (
          <div className="stack-list">
            {latestAttempts.map((item) => (
              <div className="list-card" key={item.id}>
                <div>
                  <strong>{item.quiz?.title_id || "Kuis"}</strong>
                  <p>{item.quiz?.course?.title_id || "Course"}</p>
                </div>
                <span>{new Date(item.created_at).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
