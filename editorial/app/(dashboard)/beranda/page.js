import PageHeader from "@/components/PageHeader";

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default function EditorialBerandaPage() {
  return (
    <main className="page-shell">
      <PageHeader
        badge="EDITORIAL"
        title="Beranda"
        description="Ringkasan ruang kerja penulis dan editor. Isi dashboard ini akan didesain pada tahap berikutnya."
      />

      <section className="stats-grid editorial-stats">
        <StatCard label="Draft aktif" value="0" />
        <StatCard label="Artikel terjadwal" value="0" />
        <StatCard label="Media terbaru" value="0" />
        <StatCard label="Komentar baru" value="0" />
      </section>

      <section className="panel-grid two-up">
        <article className="placeholder-panel editorial-placeholder">
          <h2>Workflow editorial</h2>
          <p>Area ini disiapkan untuk merangkum antrean artikel, review editor, dan prioritas publikasi.</p>
        </article>
        <article className="placeholder-panel editorial-placeholder">
          <h2>Aktivitas pembaca</h2>
          <p>Area ini disiapkan untuk menampilkan komentar, performa artikel, dan insight pembaca.</p>
        </article>
      </section>
    </main>
  );
}
