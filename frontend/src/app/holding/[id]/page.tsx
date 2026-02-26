"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { fetchHolding, formatUSD, formatPct } from "@/lib/api";

export default function HoldingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    issuer_name: string;
    ticker: string | null;
    cusip: string;
    time_series: { quarter: string; value_usd: number; weight_pct: number; shares: number; rank: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"pct" | "usd">("pct");

  useEffect(() => {
    if (!id) return;
    fetchHolding(id)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p className="text-body text-ink-secondary">Loading...</p>;
  if (error) return <p className="text-body text-negative">Error: {error}</p>;
  if (!data) return null;

  const ts = data.time_series;
  const values = mode === "pct" ? ts.map((d) => d.weight_pct) : ts.map((d) => d.value_usd / 1e9);
  const maxVal = Math.max(...values, 1);

  return (
    <main className="space-y-8">
      <h1 className="text-display text-ink-primary">{data.issuer_name}</h1>
      <p className="text-body text-ink-secondary">
        {data.ticker && <span>{data.ticker}</span>}
        <span className="mx-2">·</span>
        <span>{data.cusip}</span>
      </p>

      <ChartFrame
        conclusionTitle={ts.length ? `${data.issuer_name} ${mode === "pct" ? "weight in portfolio" : "position value"} over time` : "No history yet"}
        howToRead={mode === "pct" ? "Line shows % of total portfolio. Switch to $ for dollar value." : "Line shows position value in $B. Switch to % for weight."}
        footnote={ts.length ? `Latest: ${formatPct(ts[ts.length - 1].weight_pct)} weight, ${formatUSD(ts[ts.length - 1].value_usd)}.` : undefined}
      >
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setMode("pct")}
            className={`text-caption mr-2 px-2 py-1 rounded ${mode === "pct" ? "bg-accent text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setMode("usd")}
            className={`text-caption px-2 py-1 rounded ${mode === "usd" ? "bg-accent text-white" : "bg-zinc-200 dark:bg-zinc-700"}`}
          >
            $
          </button>
        </div>
        {ts.length > 0 ? (
          <>
            <div className="flex items-end gap-0.5 h-64">
              {values.map((v, i) => (
                <div
                  key={ts[i].quarter}
                  className="flex-1 min-w-0 bg-accent rounded-t opacity-90 hover:opacity-100"
                  style={{ height: `${Math.max(2, (v / maxVal) * 100)}%` }}
                  title={`${ts[i].quarter}: ${mode === "pct" ? formatPct(v) : `$${v.toFixed(2)}B`}`}
                />
              ))}
            </div>
            <div className="flex justify-between text-caption text-ink-tertiary mt-1">
              <span>{ts[0].quarter}</span>
              <span>{ts[ts.length - 1].quarter}</span>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-ink-tertiary text-body">No time series data</div>
        )}
      </ChartFrame>

      <p className="text-caption text-ink-tertiary">
        <a href={`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v1/download/agg_csv?quarter=latest`} className="text-accent hover:underline">Download time series (CSV)</a>
      </p>
    </main>
  );
}
