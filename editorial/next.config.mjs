import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import { fileURLToPath } from "node:url";

// Keep local previews running while production builds are verified.
export default function nextConfig(phase) {
  return { distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next", outputFileTracingRoot: fileURLToPath(new URL("..", import.meta.url)) };
}
