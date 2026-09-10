import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://editorial.rabbaniinstitute.id"),
  title: {
    default: "Editorial | Rabbani Institute",
    template: "%s | Editorial",
  },
  description: "Dashboard editorial untuk penulis dan tim artikel Rabbani Institute.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
