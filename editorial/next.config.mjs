import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// Keep local previews running while production builds are verified.
export default function nextConfig(phase) {
  return { distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next" };
}
