#!/usr/bin/env node
/**
 * CI gate for chart & color rules.
 *
 * 1) Ensure any detected chart usage is wrapped in ChartFrame (legacy ECharts guard).
 * 2) Forbid hardcoded hex colors in frontend source (design tokens only).
 *
 * Exits 0 if all checks pass; 1 otherwise.
 */
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "..", "src");
const chartPatterns = [
  /echarts-for-react|ReactECharts/,
  /<ECharts\s/,
  /option=\s*\{/,
];
const chartFrameImport = /ChartFrame/;

// Very simple hex color detector: #rrggbb (ignore Tailwind config by only scanning src/)
const hexColorPattern = /#[0-9a-fA-F]{6}\b/g;

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules") walk(full, files);
    else if (e.name.endsWith(".tsx") || e.name.endsWith(".jsx")) files.push(full);
  }
  return files;
}

let failed = false;
for (const file of walk(srcDir)) {
  const content = fs.readFileSync(file, "utf8");

  // 1) Legacy chart guard – keep behavior in case ECharts or similar is introduced.
  const usesChart = chartPatterns.some((p) => p.test(content));
  const usesChartFrame = chartFrameImport.test(content);
  if (usesChart && !usesChartFrame && !content.includes("ChartFrame")) {
    console.error(
      `[lint-charts] ${path.relative(
        process.cwd(),
        file,
      )}: chart usage without ChartFrame`,
    );
    failed = true;
  }

  // 2) Hex color guard – no hardcoded #RRGGBB in src/ (design-system.md).
  const hexMatches = content.match(hexColorPattern);
  if (hexMatches && hexMatches.length > 0) {
    console.error(
      `[lint-charts] ${path.relative(
        process.cwd(),
        file,
      )}: hardcoded hex color(s) found: ${Array.from(new Set(hexMatches)).join(
        ", ",
      )}`,
    );
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
