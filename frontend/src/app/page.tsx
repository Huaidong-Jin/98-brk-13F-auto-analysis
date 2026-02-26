"use client";

import { useEffect, useState } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { fetchSummary, formatUSD, formatPct } from "@/lib/api";

export default function HomePage() {
  const [data, setData] = useState<{
    latest_quarter: string | null;
    total_value_usd: number | null;
    narrative: { question1: string; question2: string; question3: string } | null;
    portfolio_trend: { quarter: string; total_value_usd: number }[];
    concentration_trend: { quarter: string; top1_pct: number; top5_pct: number; top10_pct: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-body text-ink-secondary">Loading...</p>;
  if (error) return <p className="text-body text-negative">Error: {error}</p>;

  const totalStr = data?.total_value_usd != null ? formatUSD(data.total_value_usd) : "—";
  return (
    <main className="space-y-8">
      <h1 className="text-display text-ink-primary">
        Berkshire&apos;s {totalStr} portfolio, tracked quarterly
      </h1>

      {data?.narrative && (
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-subtitle text-ink-primary mb-2">At a glance</h2>
          <ul className="list-disc list-inside text-body text-ink-secondary space-y-1">
            <li>{data.narrative.question1}</li>
            <li>{data.narrative.question2}</li>
            <li>{data.narrative.question3}</li>
          </ul>
        </section>
      )}

      {data?.portfolio_trend && data.portfolio_trend.length > 0 && (
        <ChartFrame
          conclusionTitle={`Portfolio value from ${data.portfolio_trend[0]?.quarter} to ${data.latest_quarter ?? ""}`}
          howToRead="Each point is the total reported 13F value for that quarter. Hover for exact values."
          footnote={`Latest quarter: ${data.latest_quarter ?? "—"}. Data from SEC EDGAR.`}
        >
          <div className="flex items-end gap-1 h-64">
            {data.portfolio_trend.map((d, i) => (
              <div
                key={d.quarter}
                className="flex-1 min-w-0 bg-accent rounded-t opacity-80 hover:opacity-100 transition-opacity"
                style={{ height: `${Math.max(10, (d.total_value_usd / Math.max(...data.portfolio_trend.map((x) => x.total_value_usd))) * 100)}%` }}
                title={`${d.quarter}: ${formatUSD(d.total_value_usd)}`}
              />
            ))}
          </div>
        </ChartFrame>
      )}

      {(!data?.portfolio_trend || data.portfolio_trend.length === 0) && (
        <ChartFrame
          conclusionTitle="Portfolio value over time"
          howToRead="Bar height shows total 13F portfolio value per quarter. Run the ingest pipeline to load data."
          footnote="No data yet. Backend ingest will populate this."
        >
          <div className="h-64 flex items-center justify-center text-ink-tertiary text-body">
            No quarterly data yet
          </div>
        </ChartFrame>
      )}

      {data?.concentration_trend && data.concentration_trend.length > 0 && (
        <ChartFrame
          conclusionTitle="Concentration: Top 1, Top 5, Top 10 weight"
          howToRead="Stacked area: share of portfolio in the top holdings. Higher = more concentrated."
          footnote="Weights sum to 100% per quarter."
        >
          <div className="h-64 flex items-end gap-1">
            {data.concentration_trend.slice(-20).map((d) => (
              <div key={d.quarter} className="flex-1 flex flex-col justify-end gap-0.5">
                <div className="bg-chart-1" style={{ height: `${d.top1_pct}%` }} title={`Top1: ${formatPct(d.top1_pct)}`} />
                <div className="bg-chart-2" style={{ height: `${d.top5_pct - d.top1_pct}%` }} />
                <div className="bg-chart-3" style={{ height: `${d.top10_pct - d.top5_pct}%` }} />
              </div>
            ))}
          </div>
        </ChartFrame>
      )}
    </main>
  );
}
