# Chart style guide

All charts must follow this spec. Enforced via ChartFrame and CURSOR_RULES.

## Structure (required)

1. **Conclusion title** — One sentence stating the main takeaway (e.g. "Portfolio value grew from $300B to $350B").
2. **How to read** — One sentence explaining axes/units/interaction.
3. **Footnote** — Optional: data source, unit multiplier, or caveat.

## Visual

- **Colors**: Use design tokens only (`accent`, `chart-1`…`chart-8`, `positive`, `negative`). No hex in components.
- **Single accent**: One accent color per chart for the primary series; rest neutral (zinc).
- **Grid**: Subtle (`color-grid`), no heavy borders.
- **Legend**: If multiple series, place legend top-right or below; same token set.

### Color semantics

- **Primary storyline**: use `accent` for the single most important series in a chart (e.g. total portfolio value, Top1 weight).
- **Positive vs negative**: use `positive` for新增/增持/盈利方向, and `negative` for 减持/清仓/回撤 等需要提醒的内容。
- **Ranked slices / groups**: for multiple series in the same group (Top5 holdings, sector breakdown), use `chart-1`…`chart-4/5` as a neutral sequence; avoid mixing `positive`/`negative` into purely categorical comparisons.
- **Grid and helpers**: use `color-grid` for axes/grid lines; text colors follow `ink-primary` / `ink-secondary` / `ink-tertiary` for title, body, caption.

## Tooltip

- Tooltip payload（统一顺序）：
  1. Quarter
  2. Value ($) — 使用 `formatUSD`
  3. Weight (%) — 使用 `formatPct`
  4. ΔQoQ ($)
  5. ΔQoQ (%)
- 所有图表通过 `components/viz/UnifiedTooltip.tsx` 生成 tooltip 文本，内部封装上述顺序。

## Annotation

- Mark turning points or "largest change" with short text (e.g. "Q3 2024: Apple reduced").
- Prefer text callouts over only color change.

Annotations should be computed in reusable helpers (see
`components/viz/annotations.ts`) so that peak/trough/latest markers are
consistent across charts.

## Export

- Charts must support at least one of: PNG or SVG export (via ChartFrame `exportable` or ECharts export API).

## 10-second test

Each chart must pass: "A non-finance user can state what the chart shows in under 10 seconds" without prior explanation.
