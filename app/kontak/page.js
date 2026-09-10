import Link from "next/link";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Kontak",
  description: "Jalur komunikasi resmi untuk bantuan kelas, akun, ujian, artikel, dan pembayaran Rabbani Institute.",
};

const helpChecklist = [
  "Nama lengkap dan identitas akun yang digunakan",
  "Nama kelas, artikel, atau ujian yang sedang dibuka",
  "Tangkapan layar atau pesan error jika ada",
  "Waktu kejadian dan langkah singkat yang sudah dicoba",
];

const quickLinks = [
  { label: "FAQ", href: "/faq" },
  { label: "Kebijakan Pengguna", href: "/kebijakan-pengguna" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { label: "Kebijakan Refund", href: "/kebijakan-pengembalian-dana" },
];

export default async function ContactPage() {
  const settings = await getPublicSiteSettings();
  const whatsappNumber = (settings.contact_whatsapp_number || "").replace(/\D+/g, "");
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Assalamu'alaikum, saya ingin bertanya tentang Rabbani Institute.")}`
    : null;

  return (
    <main className="page contact-page contact-redesign-page">
      <section className="contact-shell">
        <div className="contact-hero">
          <p className="contact-eyebrow">Bantuan & komunikasi</p>
          <h1>{settings.contact_heading}</h1>
          <p className="contact-subtitle">{settings.contact_intro}</p>
        </div>

        <section className="contact-channels-grid">
          <article className="contact-channel-card contact-channel-card-primary">
            <div className="contact-channel-icon icon-wa">
              <WhatsAppIcon />
            </div>
            <div className="contact-channel-body">
              <div className="contact-channel-meta">
                <span className="contact-channel-label">WhatsApp</span>
                {whatsappHref ? (
                  <span className="contact-online-badge">
                    <span className="contact-online-dot" />
                    Aktif
                  </span>
                ) : null}
              </div>
              <h2>{settings.contact_whatsapp_label}</h2>
              <p className="contact-channel-value">{settings.contact_whatsapp_number || "Nomor WhatsApp belum diatur."}</p>
              <p className="contact-channel-copy">
                Chat langsung untuk pertanyaan cepat seputar kelas, ujian, pembayaran, atau kendala akun.
              </p>
            </div>
            {whatsappHref ? (
              <Link className="contact-channel-action" href={whatsappHref} target="_blank" rel="noreferrer">
                Buka WhatsApp
                <ArrowIcon />
              </Link>
            ) : null}
          </article>

          <article className="contact-channel-card">
            <div className="contact-channel-icon icon-email">
              <EmailIcon />
            </div>
            <div className="contact-channel-body">
              <span className="contact-channel-label">Email</span>
              <h2>{settings.contact_email}</h2>
              <p className="contact-channel-copy">
                Untuk administrasi, refund, atau pertanyaan yang butuh tindak lanjut resmi.
              </p>
            </div>
            <Link className="contact-channel-action" href={`mailto:${settings.contact_email}`}>
              Kirim email
              <ArrowIcon />
            </Link>
          </article>

          <article className="contact-channel-card">
            <div className="contact-channel-icon icon-hours">
              <ClockIcon />
            </div>
            <div className="contact-channel-body">
              <span className="contact-channel-label">Jam layanan</span>
              <h2>{settings.contact_hours}</h2>
              <p className="contact-channel-copy">{settings.contact_address}</p>
            </div>
          </article>
        </section>

        <div className="contact-divider" />

        <section className="contact-section-stack">
          <p className="contact-section-title">Sebelum menghubungi admin</p>
          <div className="contact-checklist">
            {helpChecklist.map((item) => (
              <div className="contact-check-item" key={item}>
                <span className="contact-check-dot">
                  <CheckIcon />
                </span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="contact-notice">
          <span className="contact-notice-icon">
            <InfoIcon />
          </span>
          <p>
            <strong>Keamanan akun:</strong> {settings.contact_notice}
          </p>
        </section>

        <div className="contact-divider" />

        <section className="contact-section-stack">
          <p className="contact-section-title">Halaman yang mungkin membantu</p>
          <div className="contact-quick-links">
            {quickLinks.map((link) => (
              <Link className="contact-quick-link" href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.66.96.98-3.58-.24-.38A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm5.44-7.47c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.12.57-.08 1.75-.72 2-1.41.25-.7.25-1.3.17-1.41-.07-.12-.27-.19-.57-.34z"
        fill="#16a34a"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" strokeLinecap="round" />
      <path d="M2 7l10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 10 10" fill="none" stroke="#16a34a" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 5l2.5 2.5L8 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 5v3.5M8 11v.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 10h14M10 3l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
