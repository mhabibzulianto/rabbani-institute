/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      { source: "/landing-preview/:path*", headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      { source: "/api/landing-preview", headers: [{ key: "Cache-Control", value: "no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
  async redirects() {
    return [
      {
        source: "/account/profile",
        destination: "/profile",
        permanent: true,
      },
      {
        source: "/account/security",
        destination: "/security",
        permanent: true,
      },
      {
        source: "/account/addresses",
        destination: "/addresses",
        permanent: true,
      },
      {
        source: "/account/payments",
        destination: "/payments",
        permanent: true,
      },
      {
        source: "/account",
        destination: "/",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      ...["profile", "security", "addresses", "payments"].map((page) => ({
        source: `/${page}`,
        destination: `/account/${page}`,
      })),
      {
        source: "/osban.id",
        destination: "https://osban-id.vercel.app",
      },
      {
        source: "/osban.id/:path*",
        destination: "https://osban-id.vercel.app/:path*",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
      },
    ],
  },
};

export default nextConfig;
