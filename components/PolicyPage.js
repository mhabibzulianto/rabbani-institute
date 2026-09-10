export default function PolicyPage({ pretitle, title, intro, sections }) {
  return (
    <main className="page policy-page">
      <section className="policy-hero">
        <p className="section-label">{pretitle}</p>
        <h1>{title}</h1>
        <p className="policy-intro">{intro}</p>
      </section>

      <section className="policy-shell">
        {sections.map((section, index) => (
          <article className="policy-card" key={section.heading}>
            <div className="policy-number">{String(index + 1).padStart(2, "0")}</div>
            <div className="policy-copy">
              <h2>{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.items?.length ? (
                <ul className="policy-list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
