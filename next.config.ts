import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits a self-contained server bundle in .next/standalone with only the
  // dependencies the app actually imports. That is what the Docker runtime
  // stage runs, so the final image needs no node_modules of its own.
  output: "standalone",

  // The Docker runtime copies `.next/static` next to the standalone bundle
  // because standalone output deliberately omits build assets.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
