import { faqItems } from "@/lib/site-content";

export const metadata = {
  title: "FAQ",
  description: "Pertanyaan umum seputar akun, kelas, ujian, pembayaran, dan alur belajar di Rabbani Institute.",
};

export default function FaqPage() {
  return (
    <main className="page">
      <section className="policy-hero">
        <p className="section-label">FAQ</p>
        <h1>Pertanyaan yang paling sering ditanyakan</h1>
        <p className="policy-intro">
          Ringkasan jawaban cepat untuk alur akun, kelas, ujian, pembayaran, dan bantuan umum di Rabbani Institute.
        </p>
      </section>

      <section className="policy-shell">
        {faqItems.map((item, index) => (
          <article className="policy-card" key={item.question}>
            <span className="policy-number">{index + 1}</span>
            <div className="policy-copy">
              <h2>{item.question}</h2>
              <p>{item.answer}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
