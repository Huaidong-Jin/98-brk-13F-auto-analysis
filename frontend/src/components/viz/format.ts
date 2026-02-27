"use client";

import { formatUSD, formatPct } from "@/lib/api";

/**
 * Lightweight formatting helpers for all charts.
 *
 * These wrap the shared helpers in `lib/api` so visualization code
 * has a single import surface and consistent behavior.
 */

export { formatUSD, formatPct };

export function formatDeltaUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  const formatted = formatUSD(abs);
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatted}`;
}

export function formatDeltaPct(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Number(value).toFixed(decimals)}%`;
}

