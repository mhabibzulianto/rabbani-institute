import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: "https://osban-id.vercel.app",
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
