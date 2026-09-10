import "../node_modules/tw-animate-css/dist/tw-animate.css";
import "../node_modules/shadcn/dist/tailwind.css";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import { AuthProvider } from "@/components/AuthProvider";
import FloatingContactButton from "@/components/FloatingContactButton";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getPublicSiteSettings } from "@/lib/site-settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = {
  metadataBase: new URL("https://www.rabbaniinstitute.id"),
  title: {
    default: "Rabbani Institute | Belajar Islam & Bahasa Arab Online",
    template: "%s | Rabbani Institute",
  },
  description: "Platform e-learning Islam dan Bahasa Arab secara terstruktur untuk kelas mandiri, kelas madrasah, ujian, dan artikel pembelajaran.",
  openGraph: {
    title: "Rabbani Institute | Belajar Islam & Bahasa Arab Online",
    description: "Belajar Islam dan Bahasa Arab secara terstruktur lewat kelas, ujian, dan artikel pembelajaran.",
    url: "https://www.rabbaniinstitute.id",
    siteName: "Rabbani Institute",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/images/rabbani-hero.jpg",
        width: 1100,
        height: 760,
        alt: "Rabbani Institute - Belajar Islam dan Bahasa Arab secara terstruktur",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rabbani Institute | Belajar Islam & Bahasa Arab Online",
    description: "Belajar Islam dan Bahasa Arab secara terstruktur lewat kelas, ujian, dan artikel pembelajaran.",
    images: ["/images/rabbani-hero.jpg"],
  },
  icons: {
    icon: "/favicon.jpg",
    shortcut: "/favicon.jpg",
    apple: "/favicon.jpg",
  },
};

export default async function RootLayout({ children }) {
  const headerStore = await headers();
  const host = headerStore.get("host")?.split(":")[0]?.toLowerCase() || "";
  const supabase = await createSupabaseServerClient();
  const [{ data: { session } }, siteSettings] = await Promise.all([
    supabase.auth.getSession(),
    getPublicSiteSettings(),
  ]);

  return (
    <html lang="id" dir="ltr" data-scroll-behavior="smooth">
      <body>
        <TooltipProvider delayDuration={200}>
          <AuthProvider initialSession={session}>
            <Header host={host} />
            {children}
            <SiteFooter />
            <FloatingContactButton settings={siteSettings} />
            <Analytics />
          </AuthProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
