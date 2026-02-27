"use client";

import type { ReactNode } from "react";
import { UnifiedTooltip as BaseTooltip } from "@/components/charts/UnifiedTooltip";
import { formatUSD, formatPct } from "./format";

export interface VizTooltipProps {
  quarter: string;
  valueUsd?: number | null;
  weightPct?: number | null;
  deltaUsd?: number | null;
  deltaPct?: number | null;
  label?: string;
  children: ReactNode;
  className?: string;
}

/**
 * D3-friendly tooltip wrapper with a standard payload:
 * Quarter / Value($) / Weight(%) / ΔQoQ($) / ΔQoQ(%)
 */
export function UnifiedTooltip({
  quarter,
  valueUsd,
  weightPct,
  deltaUsd,
  deltaPct,
  label,
  children,
  className,
}: VizTooltipProps) {
  const parts: string[] = [];
  if (valueUsd != null) parts.push(formatUSD(valueUsd));
  if (weightPct != null) parts.push(formatPct(weightPct));
  if (deltaUsd != null) {
    const sign = deltaUsd >= 0 ? "+" : "-";
    parts.push(`${sign}${formatUSD(Math.abs(deltaUsd))}`);
  }
  if (deltaPct != null) {
    const sign = deltaPct >= 0 ? "+" : "";
    parts.push(`${sign}${deltaPct.toFixed(1)}%`);
  }
  if (label) parts.push(label);

  const value = parts.join(" · ");

  return (
    <BaseTooltip quarter={quarter} value={value} className={className}>
      {children}
    </BaseTooltip>
  );
}

