#!/usr/bin/env node
/**
 * CI gate: ensure chart components are wrapped in ChartFrame.
 * Exits 0 if no chart usage without ChartFrame; 1 otherwise.
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
  const usesChart = chartPatterns.some((p) => p.test(content));
  const usesChartFrame = chartFrameImport.test(content);
  if (usesChart && !usesChartFrame && !content.includes("ChartFrame")) {
    console.error(`[lint-charts] ${path.relative(process.cwd(), file)}: chart usage without ChartFrame`);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
