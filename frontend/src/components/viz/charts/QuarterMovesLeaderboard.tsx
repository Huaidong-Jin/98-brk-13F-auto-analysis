"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import { UnifiedTooltip } from "@/components/viz/UnifiedTooltip";
import { formatUSD, formatPct, formatDeltaUsd, formatDeltaPct } from "@/components/viz/format";

export type ChangeRow = {
  issuer_name: string;
  cusip: string;
  ticker: string | null;
  weight_pct: number;
  value_usd: number;
  delta_pct: number;
  delta_usd: number;
  label: string;
};

interface QuarterMovesLeaderboardProps {
  buys: ChangeRow[];
  sells: ChangeRow[];
  metric: "value_usd" | "weight_pct";
  onMetricChange: (next: "value_usd" | "weight_pct") => void;
}

/**
 * Story Mode chart 3: what changed this quarter.
 *
 * Layout: Linear-style left/right lists with an inline bar showing magnitude
 * of the chosen metric (Δ$ or Δ%) and a label chip.
 */
export function QuarterMovesLeaderboard({
  buys,
  sells,
  metric,
  onMetricChange,
}: QuarterMovesLeaderboardProps) {
  const [sortedBuys, sortedSells, maxAbs] = useMemo(() => {
    const byMetric = (row: ChangeRow) =>
      metric === "weight_pct" ? Math.abs(row.delta_pct) : Math.abs(row.delta_usd);
    const sb = [...buys].sort((a, b) => byMetric(b) - byMetric(a)).slice(0, 10);
    const ss = [...sells].sort((a, b) => byMetric(b) - byMetric(a)).slice(0, 10);
    const maxVal = Math.max(
      1,
      d3.max(sb, byMetric) ?? 1,
      d3.max(ss, byMetric) ?? 1,
    );
    return [sb, ss, maxVal] as const;
  }, [buys, sells, metric]);

  const scale = (value: number) => {
    const v = metric === "weight_pct" ? Math.abs(value) : Math.abs(value);
    return (v / maxAbs) * 100;
  };

  const renderRow = (row: ChangeRow, isBuy: boolean) => {
    const barWidth = Math.max(8, scale(metric === "weight_pct" ? row.delta_pct : row.delta_usd));
    const deltaUsdText = formatDeltaUsd(row.delta_usd);
    const deltaPctText = formatDeltaPct(row.delta_pct);
    const weight = formatPct(row.weight_pct);
    const value = formatUSD(row.value_usd);
    const label = row.label;

    return (
      <UnifiedTooltip
        key={row.cusip}
        quarter={row.issuer_name}
        valueUsd={row.value_usd}
        weightPct={row.weight_pct}
        deltaUsd={row.delta_usd}
        deltaPct={row.delta_pct}
        label={label}
        className="block"
      >
        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100 last:border-0 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="text-body text-ink-primary truncate">{row.issuer_name}</div>
            <div className="text-caption text-ink-tertiary truncate">
              {weight} · {value}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative h-2 w-28 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
              <div
                className={`absolute inset-y-0 ${
                  isBuy ? "bg-positive" : "bg-negative"
                } rounded-full`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="text-right text-caption text-ink-secondary">
              <div>
                {deltaUsdText} / {deltaPctText}
              </div>
              <div className="text-ink-tertiary">{label}</div>
            </div>
          </div>
        </div>
      </UnifiedTooltip>
    );
  };

  const metricLabel = metric === "value_usd" ? "$ Δ" : "% Δ";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2 text-caption text-ink-secondary">
        <span>排序:</span>
        <button
          type="button"
          className={`px-2 py-0.5 rounded border ${
            metric === "value_usd"
              ? "border-accent text-accent"
              : "border-zinc-300 text-ink-secondary dark:border-zinc-700"
          }`}
          onClick={() => onMetricChange("value_usd")}
        >
          按金额 ($)
        </button>
        <button
          type="button"
          className={`px-2 py-0.5 rounded border ${
            metric === "weight_pct"
              ? "border-accent text-accent"
              : "border-zinc-300 text-ink-secondary dark:border-zinc-700"
          }`}
          onClick={() => onMetricChange("weight_pct")}
        >
          按占比 (%)
        </button>
        <span className="text-ink-tertiary">当前: {metricLabel}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-caption font-semibold text-ink-secondary mb-1">加仓最多</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedBuys.map((row) => renderRow(row, true))}
            {sortedBuys.length === 0 && (
              <p className="text-caption text-ink-tertiary py-2">无明显加仓。</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-caption font-semibold text-ink-secondary mb-1">减仓最多</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedSells.map((row) => renderRow(row, false))}
            {sortedSells.length === 0 && (
              <p className="text-caption text-ink-tertiary py-2">无明显减仓。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

