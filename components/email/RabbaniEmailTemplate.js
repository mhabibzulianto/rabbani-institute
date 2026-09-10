const styles = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#f7fafb",
    color: "#26333d",
    fontFamily: "Inter, Arial, sans-serif",
  },
  wrapper: {
    width: "100%",
    backgroundColor: "#f7fafb",
    padding: "24px 12px",
  },
  card: {
    width: "100%",
    maxWidth: "640px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    border: "1px solid #dbe6ed",
    borderRadius: "8px",
    overflow: "hidden",
    boxShadow: "0 18px 42px rgba(0, 77, 122, 0.08)",
  },
  topBar: {
    height: "6px",
    backgroundColor: "#ffc107",
  },
  section: {
    padding: "32px",
  },
  hero: {
    backgroundColor: "#004d7a",
    backgroundImage:
      "linear-gradient(135deg, rgba(255, 193, 7, 0.18) 0%, rgba(255, 193, 7, 0) 48%), linear-gradient(180deg, #004d7a 0%, #003b5d 100%)",
    color: "#ffffff",
  },
  brandRow: {
    marginBottom: "28px",
  },
  brandMark: {
    display: "inline-block",
    width: "42px",
    height: "42px",
    lineHeight: "42px",
    textAlign: "center",
    backgroundColor: "#ffc107",
    border: "2px solid #ffffff",
    borderRadius: "8px",
    color: "#004d7a",
    fontSize: "20px",
    fontWeight: "800",
    letterSpacing: "0.02em",
  },
  brandText: {
    display: "inline-block",
    marginLeft: "12px",
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "800",
    verticalAlign: "top",
    lineHeight: "42px",
  },
  eyebrow: {
    margin: "0 0 12px",
    color: "#b7d3e6",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  title: {
    margin: "0 0 16px",
    color: "#ffffff",
    fontSize: "34px",
    lineHeight: "1.08",
    fontWeight: "800",
  },
  lead: {
    margin: 0,
    color: "#e7f2f8",
    fontSize: "16px",
    lineHeight: "1.7",
  },
  buttonWrap: {
    paddingTop: "24px",
  },
  button: {
    display: "inline-block",
    padding: "14px 22px",
    backgroundColor: "#ffc107",
    color: "#101820",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "800",
    textDecoration: "none",
  },
  contentTitle: {
    margin: "0 0 12px",
    color: "#101820",
    fontSize: "24px",
    fontWeight: "800",
    lineHeight: "1.2",
  },
  paragraph: {
    margin: "0 0 16px",
    color: "#667784",
    fontSize: "15px",
    lineHeight: "1.75",
  },
  panel: {
    margin: "24px 0",
    padding: "20px",
    backgroundColor: "#e7f2f8",
    border: "1px solid #dbe6ed",
    borderRadius: "8px",
  },
  panelLabel: {
    margin: "0 0 8px",
    color: "#004d7a",
    fontSize: "12px",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  panelText: {
    margin: 0,
    color: "#26333d",
    fontSize: "15px",
    lineHeight: "1.7",
  },
  featureGrid: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 12px",
  },
  featureCell: {
    width: "50%",
    paddingRight: "8px",
    verticalAlign: "top",
  },
  featureCard: {
    height: "100%",
    padding: "18px",
    backgroundColor: "#ffffff",
    border: "1px solid #dbe6ed",
    borderRadius: "8px",
  },
  featureTitle: {
    margin: "0 0 8px",
    color: "#101820",
    fontSize: "16px",
    fontWeight: "800",
  },
  featureText: {
    margin: 0,
    color: "#667784",
    fontSize: "14px",
    lineHeight: "1.65",
  },
  footer: {
    padding: "24px 32px 32px",
    borderTop: "1px solid #dbe6ed",
    color: "#667784",
    fontSize: "13px",
    lineHeight: "1.7",
  },
  footerLink: {
    color: "#004d7a",
    textDecoration: "none",
    fontWeight: "800",
  },
  preview: {
    display: "none",
    overflow: "hidden",
    lineHeight: "1px",
    opacity: 0,
    maxHeight: 0,
    maxWidth: 0,
  },
};

function FeatureRow({ features = [] }) {
  const safeFeatures = features.slice(0, 4);
  const rows = [];

  for (let index = 0; index < safeFeatures.length; index += 2) {
    rows.push(safeFeatures.slice(index, index + 2));
  }

  return rows.map((row, rowIndex) => (
    <tr key={`feature-row-${rowIndex}`}>
      {row.map((feature) => (
        <td key={feature.title} style={styles.featureCell}>
          <div style={styles.featureCard}>
            <p style={styles.featureTitle}>{feature.title}</p>
            <p style={styles.featureText}>{feature.description}</p>
          </div>
        </td>
      ))}
      {row.length === 1 ? <td style={styles.featureCell}>&nbsp;</td> : null}
    </tr>
  ));
}

export default function RabbaniEmailTemplate({
  previewText = "Lanjutkan perjalanan belajar Anda bersama rabbani-institute.",
  eyebrow = "Platform belajar online",
  title = "Belajar Islam dan Bahasa Arab secara terstruktur",
  lead = "rabbani-institute menghadirkan kelas keislaman, Bahasa Arab, dan kajian bertahap dalam satu ruang belajar yang rapi.",
  bodyTitle = "Lanjutkan langkah belajar Anda",
  body =
    "Kami menyiapkan pengalaman belajar yang rapi, fokus, dan mudah diikuti. Dari kelas pengantar sampai materi bertahap, semuanya dirancang agar proses belajar terasa tenang dan terarah.",
  highlightLabel = "Sorotan minggu ini",
  highlight =
    "Akses kelas pilihan, pantau progres belajar, dan masuk lewat SSO Rabbani Institute tanpa alur yang membingungkan.",
  ctaLabel = "Mulai belajar",
  ctaHref = "https://rabbani-institute.id/courses",
  secondaryCtaLabel = "Buka studio",
  secondaryCtaHref = "https://rabbani-institute.id/studio",
  features = [
    {
      title: "Kurikulum bertahap",
      description: "Materi disusun dari fondasi sampai pembahasan lanjutan agar belajar terasa lebih terstruktur.",
    },
    {
      title: "Studio progres",
      description: "Lihat perkembangan belajar Anda dalam satu tampilan yang rapi dan mudah dipantau.",
    },
    {
      title: "Akses lintas layanan",
      description: "SSO Rabbani Institute memudahkan perpindahan antar produk tanpa login berulang.",
    },
    {
      title: "Nuansa visual yang tenang",
      description: "Palet biru dan aksen emas menjaga komunikasi tetap hangat, tegas, dan mudah dibaca.",
    },
  ],
  footerNote = "Email ini dikirim oleh rabbani-institute untuk mendukung proses belajar dan informasi akun Anda.",
}) {
  return (
    <html lang="id">
      <body style={styles.body}>
        <div style={styles.preview}>{previewText}</div>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={styles.wrapper}>
          <tbody>
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={styles.card}>
                  <tbody>
                    <tr>
                      <td style={styles.topBar} />
                    </tr>
                    <tr>
                      <td style={{ ...styles.section, ...styles.hero }}>
                        <div style={styles.brandRow}>
                          <span style={styles.brandMark}>RI</span>
                          <span style={styles.brandText}>rabbani-institute</span>
                        </div>
                        <p style={styles.eyebrow}>{eyebrow}</p>
                        <h1 style={styles.title}>{title}</h1>
                        <p style={styles.lead}>{lead}</p>
                        <div style={styles.buttonWrap}>
                          <a href={ctaHref} style={styles.button}>
                            {ctaLabel}
                          </a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.section}>
                        <h2 style={styles.contentTitle}>{bodyTitle}</h2>
                        <p style={styles.paragraph}>{body}</p>
                        <div style={styles.panel}>
                          <p style={styles.panelLabel}>{highlightLabel}</p>
                          <p style={styles.panelText}>{highlight}</p>
                        </div>
                        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={styles.featureGrid}>
                          <tbody>
                            <FeatureRow features={features} />
                          </tbody>
                        </table>
                        <div style={styles.buttonWrap}>
                          <a href={secondaryCtaHref} style={styles.button}>
                            {secondaryCtaLabel}
                          </a>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.footer}>
                        <p style={{ margin: "0 0 10px" }}>{footerNote}</p>
                        <p style={{ margin: 0 }}>
                          Kunjungi{" "}
                          <a href="https://rabbani-institute.id" style={styles.footerLink}>
                            rabbani-institute.id
                          </a>{" "}
                          untuk melihat kelas terbaru dan pembaruan akun Anda.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
