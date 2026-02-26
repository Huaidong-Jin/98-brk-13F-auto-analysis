# Design System — BRK 13F Tracker

Design tokens must be used everywhere; no hardcoded hex colors (see CURSOR_RULES.md).

## Colors

| Token | Light | Dark | Usage |
|-------|--------|------|--------|
| `color-ink-primary` | zinc-900 `#18181B` | zinc-100 | Primary text |
| `color-ink-secondary` | zinc-500 `#71717A` | zinc-400 | Secondary text |
| `color-ink-tertiary` | zinc-400 `#A1A1AA` | zinc-500 | Captions, hints |
| `color-bg-primary` | white `#FFFFFF` | zinc-950 `#09090B` | Page background |
| `color-bg-elevated` | zinc-100 `#F4F4F5` | zinc-900 `#18181B` | Cards, elevated surfaces |
| `color-accent` | blue-600 `#2563EB` | blue-500 | Single accent (charts, links, CTAs) |
| `color-positive` | green-600 `#16A34A` | green-500 | Increase, positive delta |
| `color-negative` | red-600 `#DC2626` | red-500 | Decrease, negative delta |
| `color-grid` | zinc-200 `#E4E4E7` | zinc-800 `#27272A` | Chart grid lines |
| `color-chart-1` … `color-chart-8` | zinc gradient | zinc gradient | Top N stack (no rainbow) |

Tailwind: use semantic names via `tailwind.config.ts` theme extension; do not use arbitrary values like `text-[#18181B]`.

## Typography

- Font: Inter (variable), fallback system-ui.
- Scale:
  - Display: 32px / 40px line / weight 700
  - Title: 20px / 28px / 600
  - Subtitle: 16px / 24px / 500
  - Body: 14px / 20px / 400
  - Caption: 12px / 16px / 400
  - Label: 11px / 14px / 500, uppercase, tracking-wide

## Spacing

- Base unit: 4px. Use Tailwind default scale (1 = 4px).
- Layout: max-w-7xl container; section padding p-6 or p-8.

## Chart rules

- One accent color only; rest neutral (zinc).
- Every chart: conclusion title + "How to read" sentence + footnote/annotation.
- See `docs/chart-style-guide.md` for full chart spec.
