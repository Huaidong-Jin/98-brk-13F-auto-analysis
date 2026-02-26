import { useMemo, useState } from "react";
import { formatPct, formatUSD } from "@/lib/api";

type Row = {
  quarter: string;
  cusip: string;
  issuer_name: string;
  ticker: string | null;
  value_usd: number;
  shares: number;
  weight_pct: number;
  rank: number;
  change_type: string | null;
  delta_value_usd: number | null;
  delta_weight_pct: number | null;
};

type Props = {
  rows: Row[];
  onSelect: (id: string) => void;
  title: string;
  searchPlaceholder: string;
  labels: {
    rank: string;
    company: string;
    weight: string;
    value: string;
    deltaPct: string;
    deltaUsd: string;
    tag: string;
    action: string;
  };
};

export function HoldingsTable({ rows, onSelect, title, searchPlaceholder, labels }: Props) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState<10 | 20 | 0>(10); // 0 = all

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = rows.filter(
        (r) =>
          r.issuer_name.toLowerCase().includes(q) ||
          (r.ticker && r.ticker.toLowerCase().includes(q)) ||
          r.cusip.toLowerCase().includes(q),
      );
    }
    if (limit === 10) return out.slice(0, 10);
    if (limit === 20) return out.slice(0, 20);
    return out;
  }, [rows, query, limit]);

  const renderTag = (row: Row) => {
    const t = row.change_type;
    if (t === "NEW") return "NEW";
    if (t === "CLOSED") return "EXIT";
    if (t === "INCREASED") return "BUY";
    if (t === "DECREASED") return "SELL";
    return "";
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-subtitle text-ink-primary">{title}</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 rounded border border-zinc-300 bg-zinc-50 px-2 text-caption text-ink-primary dark:border-zinc-700 dark:bg-zinc-900"
          />
          <div className="flex items-center gap-1 text-caption text-ink-secondary">
            <span>Top:</span>
            <button
              type="button"
              className={`px-2 py-0.5 rounded ${
                limit === 10 ? "bg-accent text-white" : "bg-zinc-100 dark:bg-zinc-900"
              }`}
              onClick={() => setLimit(10)}
            >
              10
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded ${
                limit === 20 ? "bg-accent text-white" : "bg-zinc-100 dark:bg-zinc-900"
              }`}
              onClick={() => setLimit(20)}
            >
              20
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded ${
                limit === 0 ? "bg-accent text-white" : "bg-zinc-100 dark:bg-zinc-900"
              }`}
              onClick={() => setLimit(0)}
            >
              All
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-caption">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-ink-secondary">
            <tr>
              <th className="px-3 py-2">{labels.rank}</th>
              <th className="px-3 py-2">{labels.company}</th>
              <th className="px-3 py-2">{labels.weight}</th>
              <th className="px-3 py-2">{labels.value}</th>
              <th className="px-3 py-2">{labels.deltaPct}</th>
              <th className="px-3 py-2">{labels.deltaUsd}</th>
              <th className="px-3 py-2">{labels.tag}</th>
              <th className="px-3 py-2 text-right">{labels.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filtered.map((row) => {
              const deltaPct =
                row.delta_weight_pct != null
                  ? `${row.delta_weight_pct >= 0 ? "+" : ""}${row.delta_weight_pct.toFixed(1)}%`
                  : "—";
              const deltaUsd =
                row.delta_value_usd != null ? formatUSD(Math.abs(row.delta_value_usd)) : "—";
              const tag = renderTag(row);
              return (
                <tr key={row.cusip} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60">
                  <td className="px-3 py-1.5 text-ink-tertiary">{row.rank}</td>
                  <td className="px-3 py-1.5">
                    <div className="text-ink-primary truncate">{row.issuer_name}</div>
                    <div className="text-ink-tertiary">
                      {row.ticker ?? row.cusip}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-ink-secondary">
                    {formatPct(row.weight_pct)}
                  </td>
                  <td className="px-3 py-1.5 text-ink-secondary">
                    {formatUSD(row.value_usd)}
                  </td>
                  <td className="px-3 py-1.5 text-ink-secondary">{deltaPct}</td>
                  <td className="px-3 py-1.5 text-ink-secondary">{deltaUsd}</td>
                  <td className="px-3 py-1.5 text-ink-secondary">{tag}</td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => onSelect(row.cusip)}
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-center text-ink-tertiary" colSpan={8}>
                  No holdings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

