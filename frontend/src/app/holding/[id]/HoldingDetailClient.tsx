"use client";

import { useEffect, useState } from "react";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { fetchHolding, formatUSD, formatPct } from "@/lib/api";
import { useLocale } from "@/i18n/context";
import { HoldingTimeSeries } from "@/components/viz/charts/HoldingTimeSeries";

type HoldingDetailClientProps = {
  id: string;
};

export function HoldingDetailClient({ id }: HoldingDetailClientProps) {
  const { t } = useLocale();
  const [data, setData] = useState<{
    issuer_name: string;
    ticker: string | null;
    cusip: string;
    time_series: {
      quarter: string;
      value_usd: number;
      weight_pct: number;
      shares: number;
      rank: number;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"pct" | "usd">("pct");

  useEffect(() => {
    if (!id) return;
    fetchHolding(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <p className="text-body text-ink-secondary">{t("home.loading")}</p>;
  }
  if (error) {
    return (
      <p className="text-body text-negative">
        {t("home.error", { message: error })}
      </p>
    );
  }
  if (!data) return null;

  const ts = data.time_series;

  const conclusionTitle = ts.length
    ? mode === "pct"
      ? t("holding.weightOverTime", { name: data.issuer_name })
      : t("holding.valueOverTime", { name: data.issuer_name })
    : t("holding.noHistory");
  const howToRead =
    mode === "pct" ? t("holding.howToReadPct") : t("holding.howToReadUsd");
  const footnote = ts.length
    ? t("holding.latestPctUsd", {
        pct: formatPct(ts[ts.length - 1].weight_pct),
        usd: formatUSD(ts[ts.length - 1].value_usd),
      })
    : undefined;

  return (
    <main className="space-y-8">
      <h1 className="text-display text-ink-primary">{data.issuer_name}</h1>
      <p className="text-body text-ink-secondary">
        {data.ticker && <span>{data.ticker}</span>}
        <span className="mx-2">·</span>
        <span>{data.cusip}</span>
      </p>

      <ChartFrame
        conclusionTitle={conclusionTitle}
        howToRead={howToRead}
        footnote={footnote}
      >
        <div className="mb-2">
          <button
            type="button"
            onClick={() => setMode("pct")}
            className={`text-caption mr-2 px-2 py-1 rounded ${
              mode === "pct"
                ? "bg-accent text-white"
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => setMode("usd")}
            className={`text-caption px-2 py-1 rounded ${
              mode === "usd"
                ? "bg-accent text-white"
                : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          >
            $
          </button>
        </div>
        {ts.length > 0 ? (
          <HoldingTimeSeries data={ts} mode={mode} />
        ) : (
          <div className="h-64 flex items-center justify-center text-ink-tertiary text-body">
            {t("holding.noTimeSeries")}
          </div>
        )}
      </ChartFrame>

      <p className="text-caption text-ink-tertiary">
        <a
          href={`${
            process.env.NEXT_PUBLIC_API_URL || ""
          }/api/v1/download/agg_csv?quarter=latest`}
          className="text-accent hover:underline"
        >
          {t("holding.downloadCsv")}
        </a>
      </p>
    </main>
  );
}

