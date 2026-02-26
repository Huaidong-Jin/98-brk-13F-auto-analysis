import { useMemo } from "react";
import { UnifiedTooltip } from "@/components/charts/UnifiedTooltip";
import { formatPct, formatUSD } from "@/lib/api";

type ChangeRow = {
  issuer_name: string;
  cusip: string;
  ticker: string | null;
  weight_pct: number;
  value_usd: number;
  delta_pct: number;
  delta_usd: number;
  label: string;
};

type Props = {
  buys: ChangeRow[];
  sells: ChangeRow[];
  metric: "value_usd" | "weight_pct";
  onMetricChange: (next: "value_usd" | "weight_pct") => void;
};

export function ChangesLeaderboard({ buys, sells, metric, onMetricChange }: Props) {
  const sortKeyLabel = metric === "weight_pct" ? "% Δ" : "$ Δ";

  const sortedBuys = useMemo(() => {
    const copy = [...buys];
    copy.sort((a, b) => {
      const aVal = metric === "weight_pct" ? Math.abs(a.delta_pct) : Math.abs(a.delta_usd);
      const bVal = metric === "weight_pct" ? Math.abs(b.delta_pct) : Math.abs(b.delta_usd);
      return bVal - aVal;
    });
    return copy;
  }, [buys, metric]);

  const sortedSells = useMemo(() => {
    const copy = [...sells];
    copy.sort((a, b) => {
      const aVal = metric === "weight_pct" ? Math.abs(a.delta_pct) : Math.abs(a.delta_usd);
      const bVal = metric === "weight_pct" ? Math.abs(b.delta_pct) : Math.abs(b.delta_usd);
      return bVal - aVal;
    });
    return copy;
  }, [sells, metric]);

  const renderRow = (row: ChangeRow) => {
    const weight = formatPct(row.weight_pct);
    const value = formatUSD(row.value_usd);
    const deltaPct = `${row.delta_pct >= 0 ? "+" : ""}${row.delta_pct.toFixed(1)}%`;
    const deltaUsd = formatUSD(Math.abs(row.delta_usd));
    const label = row.label;
    return (
      <UnifiedTooltip
        key={row.cusip}
        quarter=""
        value={`${row.issuer_name} · ${weight} / ${value} · Δ ${deltaPct} / ${deltaUsd} (${label})`}
        className="block"
      >
        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-zinc-100 last:border-0 dark:border-zinc-800">
          <div className="min-w-0">
            <div className="text-body text-ink-primary truncate">{row.issuer_name}</div>
            <div className="text-caption text-ink-tertiary truncate">
              {weight} · {value}
            </div>
          </div>
          <div className="text-right text-caption text-ink-secondary shrink-0">
            <div>
              Δ {deltaPct} / {deltaUsd}
            </div>
            <div className="text-ink-tertiary">{label}</div>
          </div>
        </div>
      </UnifiedTooltip>
    );
  };

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
        <span className="text-ink-tertiary">当前: {sortKeyLabel}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-caption font-semibold text-ink-secondary mb-1">加仓最多</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedBuys.map(renderRow)}
            {sortedBuys.length === 0 && (
              <p className="text-caption text-ink-tertiary py-2">无明显加仓。</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-caption font-semibold text-ink-secondary mb-1">减仓最多</h3>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {sortedSells.map(renderRow)}
            {sortedSells.length === 0 && (
              <p className="text-caption text-ink-tertiary py-2">无明显减仓。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

