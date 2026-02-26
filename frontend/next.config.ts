import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Export static HTML for GitHub Pages.
  output: "export",
  // When hosted under https://huaidong-jin.github.io/98-brk-13F-auto-analysis/
  // we need a basePath and assetPrefix so links and assets resolve correctly.
  basePath:
    process.env.NODE_ENV === "production"
      ? "/98-brk-13F-auto-analysis"
      : undefined,
  assetPrefix:
    process.env.NODE_ENV === "production"
      ? "/98-brk-13F-auto-analysis/"
      : undefined,
};

export default nextConfig;
