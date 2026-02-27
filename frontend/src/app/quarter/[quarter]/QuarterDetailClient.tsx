"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { TopHoldingsTable } from "@/components/tables/TopHoldingsTable";
import { fetchQuarterDetail, formatUSD } from "@/lib/api";
import { useLocale } from "@/i18n/context";

type QuarterDetailClientProps = {
  quarter: string;
};

export function QuarterDetailClient({ quarter }: QuarterDetailClientProps) {
  const { t } = useLocale();
  const [data, setData] = useState<{
    meta: {
      quarter: string;
      total_value_usd: number;
      validation_status: string;
      sec_filing_urls: string[];
      unit_multiplier: number;
    };
    top_holdings: {
      issuer_name: string;
      cusip: string;
      value_usd: number;
      weight_pct: number;
      rank: number;
    }[];
    changes: {
      new: unknown[];
      increased: unknown[];
      decreased: unknown[];
      closed: unknown[];
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quarter) return;
    fetchQuarterDetail(quarter)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [quarter]);

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

  const { meta, top_holdings, changes } = data;
  const secLink = meta.sec_filing_urls?.[0] ?? "#";

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="text-display text-ink-primary">{quarter}</h1>
        <span className="text-subtitle text-ink-secondary">
          {formatUSD(meta.total_value_usd)}
        </span>
        <span
          className={`text-caption px-2 py-1 rounded ${
            meta.validation_status === "PASS"
              ? "bg-positive/20 text-positive"
              : "bg-negative/20 text-negative"
          }`}
        >
          {meta.validation_status}
        </span>
        <a
          href={secLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-caption text-accent hover:underline"
        >
          {t("quarter.secSource")}
        </a>
      </div>

      <ChartFrame
        conclusionTitle={t("quarter.topHoldingsTitle", {
          n: String(top_holdings.length),
        })}
        howToRead={t("quarter.topHoldingsHowToRead")}
        footnote={t("quarter.footnoteUnit", {
          mult: String(meta.unit_multiplier),
        })}
      >
        <TopHoldingsTable
          rows={top_holdings}
          title={t("quarter.topHoldingsTitle", {
            n: String(top_holdings.length),
          })}
          howToRead={t("quarter.topHoldingsHowToRead")}
        />
      </ChartFrame>

      <section>
        <h2 className="text-title text-ink-primary mb-4">
          {t("quarter.changesVsPrev")}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">
              {t("quarter.changesNew")}
            </p>
            <p className="text-title text-positive">
              {(changes.new as unknown[]).length}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">
              {t("quarter.changesIncreased")}
            </p>
            <p className="text-title text-ink-primary">
              {(changes.increased as unknown[]).length}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">
              {t("quarter.changesDecreased")}
            </p>
            <p className="text-title text-ink-primary">
              {(changes.decreased as unknown[]).length}
            </p>
          </div>
          <div className="rounded border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="text-label text-ink-tertiary">
              {t("quarter.changesClosed")}
            </p>
            <p className="text-title text-negative">
              {(changes.closed as unknown[]).length}
            </p>
          </div>
        </div>
      </section>

      <p className="text-caption text-ink-tertiary">
        <a
          href={`/api/v1/download/agg_csv?quarter=${quarter}`}
          className="text-accent hover:underline"
        >
          {t("quarter.downloadCsv")}
        </a>
      </p>
    </main>
  );
}

