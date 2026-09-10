import PageHeader from "@/components/PageHeader";

export default function PerpustakaanPage() {
  return (
    <main className="page-shell">
      <PageHeader
        title="Perpustakaan"
        description="Halaman perpustakaan masih dikosongkan untuk fase awal."
      />
      <section className="placeholder-panel">
        <h2>Perpustakaan belum diisi</h2>
        <p>Nanti area ini bisa memuat kitab, modul PDF, rekaman, atau bahan bacaan lain yang terkait dengan kelas.</p>
      </section>
    </main>
  );
}
