import "./globals.css";
import { Inter, Space_Mono } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-display",
});

export const metadata = {
  metadataBase: new URL("https://www.rabbaniinstitute.id"),
  title: "OSBAN | Olimpiade Syariah dan Bahasa Arab Nasional",
  description: "Halaman resmi OSBAN. Informasi lengkap akan segera hadir.",
  openGraph: {
    title: "OSBAN | Olimpiade Syariah dan Bahasa Arab Nasional",
    description: "Halaman resmi OSBAN. Informasi lengkap akan segera hadir.",
    url: "https://www.rabbaniinstitute.id/osban.id",
    siteName: "OSBAN",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "https://osban-id.vercel.app/logo-icon.jpg",
        width: 1000,
        height: 1000,
        alt: "Logo OSBAN",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "OSBAN | Olimpiade Syariah dan Bahasa Arab Nasional",
    description: "Halaman resmi OSBAN. Informasi lengkap akan segera hadir.",
    images: ["https://osban-id.vercel.app/logo-icon.jpg"],
  },
  icons: {
    icon: "https://osban-id.vercel.app/favicon.jpg",
    shortcut: "https://osban-id.vercel.app/favicon.jpg",
    apple: "https://osban-id.vercel.app/favicon.jpg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} ${spaceMono.variable}`}>{children}</body>
    </html>
  );
}
