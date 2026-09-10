import Link from "next/link";

export const metadata = {
  title: "Tentang Kami | rabbani-institute",
  description: "Mengenal Rabbani Institute, fokus pembelajaran, dan arah pengembangan platform.",
};

const pillars = [
  {
    title: "Belajar Bertahap",
    body: "Materi disusun agar peserta bisa belajar dengan langkah yang jelas, dari pondasi menuju pemahaman yang lebih matang.",
  },
  {
    title: "Rapi dan Terarah",
    body: "Platform dirancang agar kelas, progress, ujian, dan administrasi belajar berada dalam satu alur yang tertib.",
  },
  {
    title: "Dekat dengan Kebutuhan Nyata",
    body: "Rabbani Institute dibangun untuk mendukung kelas mandiri, kelas terjadwal, dan evaluasi yang memang dipakai dalam proses belajar sehari-hari.",
  },
];

const values = [
  "Menghadirkan pembelajaran Islam dan Bahasa Arab yang terstruktur, mudah diikuti, dan tetap serius secara ilmiah.",
  "Menjaga pengalaman belajar yang tenang, fokus, dan tidak melelahkan secara teknis.",
  "Mengembangkan sistem yang membantu admin, pengajar, dan peserta bergerak dalam ritme belajar yang lebih jelas.",
];

export default function AboutPage() {
  return (
    <main className="page about-page">
      <section className="policy-hero">
        <p className="section-label">Tentang Kami</p>
        <h1>Rabbani Institute sebagai ruang belajar yang rapi dan terarah</h1>
        <p className="policy-intro">
          Rabbani Institute adalah platform pembelajaran yang menggabungkan kelas mandiri, kelas terjadwal, dan
          modul ujian dalam satu sistem yang sederhana dipakai namun tetap serius untuk kebutuhan belajar yang nyata.
        </p>
      </section>

      <section className="about-highlight-grid">
        {pillars.map((pillar) => (
          <article className="panel about-highlight-card" key={pillar.title}>
            <h2>{pillar.title}</h2>
            <p>{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="about-story-grid">
        <article className="panel about-story-card">
          <p className="section-label">Arah Platform</p>
          <h2>Belajar yang tertata, bukan sekadar tumpukan materi</h2>
          <p>
            Kami ingin proses belajar terasa jelas sejak awal: peserta tahu harus mulai dari mana, pengajar tahu bagaimana
            materi disusun, dan admin bisa mengelola kelas tanpa alur yang berantakan.
          </p>
          <p>
            Karena itu, Rabbani Institute berkembang bukan hanya sebagai tempat menyimpan materi, tetapi sebagai sistem
            belajar yang membantu perjalanan peserta dari pendaftaran, mengikuti kelas, mengerjakan ujian, sampai
            memantau hasil belajar.
          </p>
        </article>

        <article className="panel about-story-card">
          <p className="section-label">Nilai yang Dijaga</p>
          <ul className="policy-list">
            {values.map((value) => (
              <li key={value}>{value}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel about-cta-card">
        <p className="section-label">Mulai Menjelajah</p>
        <h2>Pilih jalur belajar yang sesuai</h2>
        <p>
          Lihat katalog kelas untuk pembelajaran reguler, atau buka modul ujian jika kamu perlu mengikuti evaluasi di
          luar course utama.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="https://madrasah.rabbaniinstitute.id/kelas">
            Lihat kelas
          </Link>
          <Link className="button secondary" href="/exams">
            Lihat ujian
          </Link>
        </div>
      </section>
    </main>
  );
}
