export default function HomePage() {
  return (
    <main className="osban-shell">
      <section className="osban-hero" aria-label="OSBAN coming soon">
        <div className="osban-mark-wrap">
          <img
            src="https://osban-id.vercel.app/logo-icon.jpg"
            alt="Logo OSBAN"
            className="osban-mark"
          />
        </div>

        <p className="osban-kicker">Rabbani Institute mempersembahkan</p>
        <h1>OSBAN</h1>
        <p className="osban-name">Olimpiade Syariah dan Bahasa Arab Nasional</p>
        <p className="osban-copy">
          Halaman resmi OSBAN sedang kami siapkan. Informasi pendaftaran, jadwal, kategori lomba, dan ketentuan
          peserta akan segera diumumkan di sini.
        </p>
        <p className="osban-status">قريبا</p>
      </section>
    </main>
  );
}
