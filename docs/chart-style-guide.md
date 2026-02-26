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

## Tooltip

- Show value + unit ($B/$M, %) and quarter/label.
- Use shared component where possible (UnifiedTooltip pattern).

## Annotation

- Mark turning points or "largest change" with short text (e.g. "Q3 2024: Apple reduced").
- Prefer text callouts over only color change.

## Export

- Charts must support at least one of: PNG or SVG export (via ChartFrame `exportable` or ECharts export API).

## 10-second test

Each chart must pass: "A non-finance user can state what the chart shows in under 10 seconds" without prior explanation.
