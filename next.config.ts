import type { NextConfig } from "next";

// Site estatico: `next build` gera a pasta `out/` pronta pra CDN, sem runtime.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
