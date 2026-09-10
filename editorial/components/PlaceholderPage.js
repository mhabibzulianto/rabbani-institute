import PageHeader from "@/components/PageHeader";

export default function PlaceholderPage({ badge = "EDITORIAL", title, description }) {
  return (
    <main className="page-shell">
      <PageHeader badge={badge} title={title} description={description} />
      <section className="panel-grid">
        <article className="placeholder-panel editorial-placeholder">
          <h2>Masih kosong</h2>
          <p>{description}</p>
        </article>
      </section>
    </main>
  );
}
