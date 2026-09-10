/** @type {import('next').NextConfig} */
const nextConfig = {
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
