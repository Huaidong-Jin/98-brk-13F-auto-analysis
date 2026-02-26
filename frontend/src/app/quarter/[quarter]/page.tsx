"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { fetchQuarterDetail, formatUSD, formatPct } from "@/lib/api";

export default function QuarterDetailPage() {
  const params = useParams();
  const quarter = params.quarter as string;
  const [data, setData] = useState<{
    meta: { quarter: string; total_value_usd: number; validation_status: string; sec_filing_urls: string[]; unit_multiplier: number };
    top_holdings: { issuer_name: string; cusip: string; value_usd: number; weight_pct: number; rank: number }[];
    changes: { new: unknown[]; increased: unknown[]; decreased: unknown[]; closed: unknown[] };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quarter) return;
    fetchQuarterDetail(quarter)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quarter]);

  if (loading) return <p className="text-body text-ink-secondary">Loading...</p>;
  if (error) return <p className="text-body text-negative">Error: {error}</p>;
  if (!data) return null;

  const { meta, top_holdings, changes } = data;
  const secLink = meta.sec_filing_urls?.[0] ?? "#";

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-display text-ink-primary">{quarter}</h1>
        <span className="text-subtitle text-ink-secondary">{formatUSD(meta.total_value_usd)}</span>
        <span className={`text-caption px-2 py-1 rounded ${meta.validation_status === "PASS" ? "bg-positive/20 text-positive" : "bg-negative/20 text-negative"}`}>
          {meta.validation_status}
        </span>
        <a href={secLink} target="_blank" rel="noopener noreferrer" className="text-caption text-accent hover:underline">
          SEC source
        </a>
      </div>

      <ChartFrame
        conclusionTitle={`Top ${top_holdings.length} holdings by value`}
        howToRead="Bar length = position value. Label shows % of portfolio and $ amount."
        footnote={`Unit multiplier: ${meta.unit_multiplier}. Data from SEC 13F.`}
      >
        <ul className="space-y-2">
          {top_holdings.map((h) => (
            <li key={h.cusip} className="flex items-center gap-4">
              <span className="text-label text-ink-tertiary w-6">{h.rank}</span>
              <Link href={`/holding/${h.cusip}`} className="text-body text-ink-primary hover:text-accent min-w-[120px]">
                {h.issuer_name}
              </Link>
              <span className="flex-1 bg-chart-4 rounded" style={{ width: `${Math.min(100, h.weight_pct * 2)}%`, minWidth: "40px", height: 20 }} />
              <span className="text-caption text-ink-secondary">{formatPct(h.weight_pct)}</span>
              <span className="text-caption text-ink-secondary">{formatUSD(h.value_usd)}</span>
            </li>
          ))}
        </ul>
      </ChartFrame>

      <section>
        <h2 className="text-title text-ink-primary mb-4">Changes vs previous quarter</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">New</p>
            <p className="text-title text-positive">{(changes.new as unknown[]).length}</p>
          </div>
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">Increased</p>
            <p className="text-title text-ink-primary">{(changes.increased as unknown[]).length}</p>
          </div>
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">Decreased</p>
            <p className="text-title text-ink-primary">{(changes.decreased as unknown[]).length}</p>
          </div>
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">Closed</p>
            <p className="text-title text-negative">{(changes.closed as unknown[]).length}</p>
          </div>
        </div>
      </section>

      <p className="text-caption text-ink-tertiary">
        <a href={`/api/v1/download/agg_csv?quarter=${quarter}`} className="text-accent hover:underline">Download this quarter (CSV)</a>
      </p>
    </main>
  );
}
