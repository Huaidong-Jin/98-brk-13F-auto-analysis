"use client";

type SeriesPoint = {
  quarter: string;
  value: number;
};

export type ExtremumAnnotation = {
  type: "peak" | "trough";
  quarter: string;
  value: number;
};

/**
 * Compute simple peak/trough annotations for a time series.
 * This is intentionally generic so multiple charts can reuse it.
 */
export function computePeakAndTrough(
  series: SeriesPoint[],
): ExtremumAnnotation[] {
  if (!series.length) return [];
  let peak = series[0];
  let trough = series[0];
  for (const p of series) {
    if (p.value > peak.value) peak = p;
    if (p.value < trough.value) trough = p;
  }
  return [
    { type: "peak", quarter: peak.quarter, value: peak.value },
    { type: "trough", quarter: trough.quarter, value: trough.value },
  ];
}

