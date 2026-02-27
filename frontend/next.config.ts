import type { NextConfig } from "next";

// Allow disabling static HTML export (for local builds/tests with dynamic routes)
// via NEXT_DISABLE_EXPORT=1. In CI/deploy (GitHub Pages) we keep `output: "export"`.
const useStaticExport = process.env.NEXT_DISABLE_EXPORT !== "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Export static HTML for GitHub Pages by default.
  output: useStaticExport ? "export" : undefined,
  // When hosted under https://huaidong-jin.github.io/98-brk-13F-auto-analysis/
  // we need a basePath and assetPrefix so links and assets resolve correctly.
  basePath:
    useStaticExport && process.env.NODE_ENV === "production"
      ? "/98-brk-13F-auto-analysis"
      : undefined,
  assetPrefix:
    useStaticExport && process.env.NODE_ENV === "production"
      ? "/98-brk-13F-auto-analysis/"
      : undefined,
};

export default nextConfig;
