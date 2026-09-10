import Image from "next/image";
import Link from "next/link";
import { platformUrls } from "@/lib/platform-urls";

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.9 1.35a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.8A3.2 3.2 0 1 0 12 15.2 3.2 3.2 0 0 0 12 8.8Z"
      />
    </svg>
  );
}

function YoutubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M21.58 7.19a2.98 2.98 0 0 0-2.1-2.1C17.63 4.6 12 4.6 12 4.6s-5.63 0-7.48.49a2.98 2.98 0 0 0-2.1 2.1A31.7 31.7 0 0 0 1.93 12c0 1.62.16 3.23.49 4.81a2.98 2.98 0 0 0 2.1 2.1c1.85.49 7.48.49 7.48.49s5.63 0 7.48-.49a2.98 2.98 0 0 0 2.1-2.1c.33-1.58.49-3.19.49-4.81 0-1.62-.16-3.23-.49-4.81ZM10.2 15.38V8.62L15.85 12 10.2 15.38Z"
      />
    </svg>
  );
}

function TelegramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M20.67 3.33 2.95 10.15c-1.21.48-1.2 1.16-.22 1.46l4.55 1.42 1.76 5.53c.21.58.1.81.71.81.47 0 .68-.21.94-.47l2.28-2.22 4.74 3.5c.87.48 1.5.23 1.72-.81l3.02-14.23c.32-1.28-.49-1.86-1.78-1.28Zm-3.18 4.2-7.86 7.1-.31 3.13-1.1-3.56 9.27-8.67c.41-.36.79-.16.48 0Z"
      />
    </svg>
  );
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M17.53 3H21l-7.58 8.66L22 21h-6.73l-5.28-6.91L3.94 21H.47l8.11-9.27L0 3h6.9l4.77 6.3L17.53 3Zm-1.18 16h1.92L5.86 4.9H3.8L16.35 19Z"
      />
    </svg>
  );
}

const socialLinks = [
  {
    label: "Instagram",
    href: "https://instagram.com/rabbaniinstituteid",
    icon: InstagramIcon,
  },
  {
    label: "Youtube",
    href: "https://youtube.com/rabbaniinstituteid",
    icon: YoutubeIcon,
  },
  {
    label: "Telegram",
    href: "https://t.me/rabbaniinstituteid",
    icon: TelegramIcon,
  },
  {
    label: "X",
    href: "https://x.com/rabbaniinstid",
    icon: XIcon,
  },
];

const platformLinks = [
  { label: "Kelas", href: platformUrls.classesHome },
  { label: "Ujian", href: "/exams" },
  { label: "Artikel", href: platformUrls.articleHome },
  { label: "FAQ", href: "/faq" },
];

const instituteLinks = [
  { label: "Tentang Kami", href: "/tentang-kami" },
  { label: "Tim Pengajar", href: "/tim-pengajar" },
  { label: "Karir", href: "/karir" },
  { label: "Kontak", href: "/kontak" },
];

const legalLinks = [
  { label: "Kebijakan Pengguna", href: "/kebijakan-pengguna" },
  { label: "Kebijakan Privasi", href: "/kebijakan-privasi" },
  { label: "Kebijakan Pengembalian Dana", href: "/kebijakan-pengembalian-dana" },
];

function FooterLinkGroup({ title, links }) {
  return (
    <nav className="footer-link-group" aria-label={title}>
      <h3>{title}</h3>
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <section className="footer-brand-block">
          <div className="footer-brand-top">
            <span className="footer-brand-mark">
              <Image
                src="/images/footer-logo.jpg"
                alt="Rabbani Institute"
                width={111}
                height={111}
                sizes="44px"
              />
            </span>
            <strong>rabbani-institute</strong>
          </div>
          <p className="footer-brand-copy">
            Platform belajar online untuk memahami Al-Qur&apos;an dan Bahasa Arab secara terstruktur, tenang, dan
            bertahap.
          </p>
          <div className="footer-social-list">
            {socialLinks.map((item) => (
              <Link key={item.href} href={item.href} target="_blank" rel="noreferrer" aria-label={item.label} title={item.label}>
                <item.icon className="footer-social-icon" />
              </Link>
            ))}
          </div>
        </section>

        <FooterLinkGroup title="Platform" links={platformLinks} />
        <FooterLinkGroup title="Institute" links={instituteLinks} />
        <FooterLinkGroup title="Legal" links={legalLinks} />
      </div>

      <div className="site-footer-bottom">
        <span>&copy; 2026 Rabbani Institute. Hak cipta dilindungi.</span>
        <span>Dibuat dengan ❤️ untuk umat</span>
      </div>
    </footer>
  );
}
