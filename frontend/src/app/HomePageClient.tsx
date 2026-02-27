"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartFrame } from "@/components/charts/ChartFrame";
import { UnifiedTooltip } from "@/components/charts/UnifiedTooltip";
import { KpiCard } from "@/components/KpiCard";
import { HoldingsExplorerTable } from "@/components/tables/HoldingsExplorerTable";
import { TopHoldingsTable } from "@/components/tables/TopHoldingsTable";
import {
  fetchSummary,
  fetchChangesSummary,
  fetchTopHoldingsTimeseries,
  fetchQuarterDetail,
  fetchArtifacts,
  fetchHealth,
  formatUSD,
  formatPct,
} from "@/lib/api";
import { useLocale } from "@/i18n/context";
import { PortfolioValueArea } from "@/components/viz/charts/PortfolioValueArea";
import { ConcentrationLines } from "@/components/viz/charts/ConcentrationLines";
import { QuarterMovesLeaderboard } from "@/components/viz/charts/QuarterMovesLeaderboard";

export function HomePageClient() {
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<{
    latest_quarter: string | null;
    total_value_usd: number | null;
    narrative: {
      question1: string;
      question2: string;
      question3: string;
    } | null;
    portfolio_trend: { quarter: string; total_value_usd: number }[];
    concentration_trend: {
      quarter: string;
      top1_pct: number;
      top5_pct: number;
      top10_pct: number;
    }[];
  } | null>(null);
  const [changesSummary, setChangesSummary] = useState<
    {
      quarter: string;
      new_count: number;
      increased_count: number;
      decreased_count: number;
      closed_count: number;
    }[] | null
  >(null);
  const [topHoldingsTs, setTopHoldingsTs] = useState<{
    quarters: string[];
    series: { issuer_name: string; cusip: string; weights: number[] }[];
  } | null>(null);
  const [latestTopHoldings, setLatestTopHoldings] = useState<
    {
      issuer_name: string;
      cusip: string;
      value_usd: number;
      weight_pct: number;
      rank: number;
    }[] | null
  >(null);
  const [changesBoard, setChangesBoard] = useState<{
    quarter: string;
    compare_quarter: string | null;
    largest_buy_name: string | null;
    largest_sell_name: string | null;
    new_count: number;
    exit_count: number;
    buys: any[];
    sells: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullHoldings, setFullHoldings] = useState<any[] | null>(null);
  const [showExplore, setShowExplore] = useState(false);
  const [artifacts, setArtifacts] = useState<
    {
      artifact_type: string;
      quarter: string;
      generated_at: string | null;
      validation_status: string;
      download_url: string;
    }[]
  >([]);
  const [health, setHealth] = useState<{
    status: string;
    db_ok: boolean;
    drive_ok: boolean | null;
    last_ingest_at: string | null;
    last_ingest_status: string | null;
  } | null>(null);
  const [latestMeta, setLatestMeta] = useState<{
    quarter: string;
    validation_status: string;
    sec_filing_urls: string[];
  } | null>(null);
  const [mode, setModeState] = useState<"story" | "analyst">("story");
  const [changesMetric, setChangesMetric] = useState<"value_usd" | "weight_pct">(
    "value_usd",
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlMode = searchParams.get("mode");
    const storageMode = window.localStorage.getItem("brk13f-mode");
    const parsed =
      urlMode === "analyst" || urlMode === "story"
        ? urlMode
        : storageMode === "analyst" || storageMode === "story"
        ? storageMode
        : "story";
    setModeState(parsed);
  }, [searchParams]);

  const setMode = (next: "story" | "analyst") => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("brk13f-mode", next);
    }
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "story") {
      params.delete("mode");
    } else {
      params.set("mode", next);
    }
    router.push(`${pathname ?? "/"}?${params.toString()}`);
  };

  useEffect(() => {
    fetchSummary()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchChangesSummary(20)
      .then(setChangesSummary)
      .catch(() => setChangesSummary(null));
  }, []);

  useEffect(() => {
    fetchArtifacts()
      .then(setArtifacts)
      .catch(() => setArtifacts([]));
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    fetchTopHoldingsTimeseries(5, 20)
      .then(setTopHoldingsTs)
      .catch(() => setTopHoldingsTs(null));
  }, []);

  useEffect(() => {
    if (!data?.latest_quarter) return;
    fetchQuarterDetail(data.latest_quarter)
      .then((detail) => {
        const top = (detail?.top_holdings ?? []) as {
          issuer_name: string;
          cusip: string;
          value_usd: number;
          weight_pct: number;
          rank: number;
        }[];
        setLatestTopHoldings(top.slice(0, 10));
        if (detail?.meta) {
          setLatestMeta({
            quarter: detail.meta.quarter,
            validation_status: detail.meta.validation_status,
            sec_filing_urls: detail.meta.sec_filing_urls ?? [],
          });
        } else {
          setLatestMeta(null);
        }
      })
      .catch(() => setLatestTopHoldings(null));
    import("@/lib/api")
      .then((m) =>
        m.fetchChangesLeaderboard(
          data.latest_quarter as string,
          changesMetric,
        ),
      )
      .then(setChangesBoard)
      .catch(() => setChangesBoard(null));
    import("@/lib/api")
      .then((m) => m.fetchQuarterHoldingsFull(data.latest_quarter as string))
      .then(setFullHoldings)
      .catch(() => setFullHoldings(null));
  }, [data?.latest_quarter, changesMetric]);

  if (loading) {
    return (
      <p className="text-body text-ink-secondary">{t("home.loading")}</p>
    );
  }
  if (error) {
    return (
      <p className="text-body text-negative">
        {t("home.error", { message: error })}
      </p>
    );
  }

  const totalStr =
    data?.total_value_usd != null ? formatUSD(data.total_value_usd) : "—";
  const totalB =
    data?.total_value_usd != null
      ? (data.total_value_usd / 1e9).toFixed(1)
      : "—";
  const quarter = data?.latest_quarter ?? "—";
  const qoqDeltaUsd =
    data && typeof (data as any).qoq_delta_usd === "number"
      ? formatUSD(Math.abs((data as any).qoq_delta_usd))
      : "—";
  const qoqDeltaPct =
    data && typeof (data as any).qoq_delta_pct === "number"
      ? `${(data as any).qoq_delta_pct >= 0 ? "+" : ""}${(
          data as any
        ).qoq_delta_pct.toFixed(1)}%`
      : "—";
  const top1Weight =
    data && typeof (data as any).top1_weight_pct === "number"
      ? `${(data as any).top1_weight_pct.toFixed(1)}%`
      : "—";
  const top1Value =
    data && typeof (data as any).top1_value_usd === "number"
      ? formatUSD((data as any).top1_value_usd)
      : "—";
  const top1DeltaPct =
    data && typeof (data as any).top1_delta_pct === "number"
      ? `${(data as any).top1_delta_pct >= 0 ? "+" : ""}${(
          data as any
        ).top1_delta_pct.toFixed(1)}%`
      : "—";
  const top1DeltaUsd =
    data && typeof (data as any).top1_delta_usd === "number"
      ? formatUSD(Math.abs((data as any).top1_delta_usd))
      : "—";
  const top10Weight =
    data && typeof (data as any).top10_weight_pct === "number"
      ? `${(data as any).top10_weight_pct.toFixed(1)}%`
      : "—";
  const top10Value =
    data && typeof (data as any).top10_value_usd === "number"
      ? formatUSD((data as any).top10_value_usd)
      : "—";
  const top10YoyDeltaPct =
    data && typeof (data as any).top10_yoy_delta_pct === "number"
      ? `${(data as any).top10_yoy_delta_pct >= 0 ? "+" : ""}${(
          data as any
        ).top10_yoy_delta_pct.toFixed(1)}%`
      : "—";

  const qoqDirection = (data as any)?.qoq_direction ?? "";
  const concDirection = (data as any)?.conc_direction ?? "";
  const top1Direction = (data as any)?.top1_direction ?? "";
  const top1Name = (data as any)?.top1_name ?? "—";
  const peakQuarter = (data as any)?.peak_quarter ?? "—";
  const peakValue =
    data && typeof (data as any).peak_value_usd === "number"
      ? formatUSD((data as any).peak_value_usd)
      : "—";

  return (
    <main className="space-y-8">
      <header className="space-y-3">
        <h1 className="text-display text-ink-primary">
          {t("home.title", { total: totalStr })}
        </h1>
        <p className="text-body text-ink-secondary">
          {quarter} ｜ {totalStr} ｜ SEC 13F
        </p>
        <p className="text-subtitle text-ink-primary">
          {t("home.storySummary", {
            qoq_direction: qoqDirection,
            conc_direction: concDirection,
            top1_name: top1Name,
            top1_direction: top1Direction,
          })}
        </p>
        <div className="flex gap-2 text-caption text-ink-secondary">
          <button
            type="button"
            className={`px-2 py-1 rounded border ${
              mode === "story"
                ? "border-accent text-accent"
                : "border-zinc-300 text-ink-secondary dark:border-zinc-700"
            }`}
            onClick={() => setMode("story")}
          >
            Story
          </button>
          <button
            type="button"
            className={`px-2 py-1 rounded border ${
              mode === "analyst"
                ? "border-accent text-accent"
                : "border-zinc-300 text-ink-secondary dark:border-zinc-700"
            }`}
            onClick={() => setMode("analyst")}
          >
            Analyst
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <KpiCard
          title={t("kpi.portfolioSize.title")}
          primary={totalStr}
          secondary={t("kpi.portfolioSize.secondary", {
            delta_usd: qoqDeltaUsd,
            delta_pct: qoqDeltaPct,
          })}
          description={t("kpi.portfolioSize.description")}
        />
        <KpiCard
          title={t("kpi.top1.title")}
          primary={`${top1Name} · ${top1Weight} / ${top1Value}`}
          secondary={t("kpi.top1.secondary", {
            delta_pct: top1DeltaPct,
            delta_usd: top1DeltaUsd,
          })}
          description={t("kpi.top1.description")}
        />
        <KpiCard
          title={t("kpi.top10.title")}
          primary={`${top10Weight} / ${top10Value}`}
          secondary={t("kpi.top10.secondary", {
            delta_pct: top10YoyDeltaPct,
          })}
          description={t("kpi.top10.description")}
        />
      </section>

      {mode === "analyst" && data?.narrative && (
        <section className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
          <h2 className="text-subtitle text-ink-primary mb-2">
            {t("home.atAGlance")}
          </h2>
          <ul className="list-disc list-inside text-body text-ink-secondary space-y-1">
            <li>{t("narrative.q1", { total: totalB, quarter })}</li>
            <li>{t("narrative.q2")}</li>
            <li>{t("narrative.q3")}</li>
          </ul>
        </section>
      )}

      {data?.portfolio_trend && data.portfolio_trend.length > 0 && (
        <ChartFrame
          conclusionTitle={t("charts.storyPortfolioTitle", {
            peak_quarter: peakQuarter,
            peak_value_usd: peakValue,
            total_value_usd: totalStr,
            latest_quarter: data?.latest_quarter ?? "—",
          })}
          howToRead={t("charts.storyPortfolioHowToRead")}
          footnote={t("charts.storyPortfolioFootnote", {
            latest_quarter: data?.latest_quarter ?? "—",
          })}
        >
          <PortfolioValueArea data={data.portfolio_trend} />
        </ChartFrame>
      )}

      {(!data?.portfolio_trend || data.portfolio_trend.length === 0) && (
        <ChartFrame
          conclusionTitle={t("charts.portfolioEmptyTitle")}
          howToRead={t("charts.portfolioEmptyHowToRead")}
          footnote={t("charts.portfolioEmptyFootnote")}
        >
          <div className="h-64 flex items-center justify-center text-ink-tertiary text-body">
            {t("charts.noQuarterlyData")}
          </div>
        </ChartFrame>
      )}

      {data?.portfolio_trend &&
        data.portfolio_trend.length >= 2 &&
        (() => {
          const trend = data.portfolio_trend;
          const growth: { quarter: string; pct: number }[] = [];
          for (let i = 1; i < trend.length; i += 1) {
            const prev = trend[i - 1].total_value_usd;
            const curr = trend[i].total_value_usd;
            const pct = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
            growth.push({ quarter: trend[i].quarter, pct });
          }
          const last20 = growth.slice(-20);
          const maxAbs = Math.max(...last20.map((g) => Math.abs(g.pct)), 0.5);
          const hPx = 200;
          const half = hPx / 2;
          return mode === "analyst" ? (
            <ChartFrame
              conclusionTitle={t("charts.growthRateTitle")}
              howToRead={t("charts.growthRateHowToRead")}
              footnote={t("charts.growthRateFootnote")}
            >
              <div className="flex items-stretch gap-px" style={{ height: hPx }}>
                {last20.map((g) => {
                  const barH = (Math.abs(g.pct) / maxAbs) * half;
                  const isPos = g.pct >= 0;
                  const topSpacer = isPos ? half - barH : half;
                  const bottomSpacer = isPos ? half : half - barH;
                  return (
                    <UnifiedTooltip
                      key={g.quarter}
                      quarter={g.quarter}
                      value={`${g.pct >= 0 ? "+" : ""}${g.pct.toFixed(2)}%`}
                      className="relative flex-1 min-w-0 shrink-0 flex flex-col"
                    >
                      <div style={{ height: topSpacer, minHeight: 0 }} />
                      <div
                        className={`w-full shrink-0 ${
                          isPos
                            ? "bg-positive rounded-t"
                            : "bg-negative rounded-b"
                        }`}
                        style={{ height: barH }}
                      />
                      <div style={{ height: bottomSpacer, minHeight: 0 }} />
                    </UnifiedTooltip>
                  );
                })}
              </div>
              <p className="text-caption text-ink-tertiary mt-1">
                {last20[0]?.quarter} → {last20[last20.length - 1]?.quarter}
              </p>
            </ChartFrame>
          ) : null;
        })()}

      {data?.concentration_trend &&
        data.concentration_trend.length > 0 &&
        (() => {
          const conc = data.concentration_trend.slice(-20);
          const totalsByQuarter = new Map<string, number>(
            (data?.portfolio_trend ?? []).map((d) => [
              d.quarter,
              d.total_value_usd,
            ]),
          );
          return (
            <ChartFrame
              conclusionTitle={t("charts.storyConcentrationTitle", {
                conc_direction: concDirection,
                top1_weight_pct: top1Weight,
                top10_weight_pct: top10Weight,
                latest_quarter: data?.latest_quarter ?? "—",
              })}
              howToRead={t("charts.storyConcentrationHowToRead")}
              footnote={t("charts.storyConcentrationFootnote")}
            >
              <ConcentrationLines
                data={conc}
                totalsByQuarter={totalsByQuarter}
              />
              {latestTopHoldings && latestTopHoldings.length > 0 && (
                <div className="mt-4 text-caption text-ink-secondary">
                  <p className="mb-2">
                    {t("charts.concentrationLegendTitle", {
                      quarter: data?.latest_quarter ?? "—",
                    })}
                  </p>
                  <ol className="space-y-1">
                    {latestTopHoldings.slice(0, 10).map((h) => (
                      <li
                        key={h.cusip}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="text-ink-primary">
                          {h.rank}. {h.issuer_name}
                        </span>
                        <span className="text-ink-tertiary whitespace-nowrap">
                          {formatPct(h.weight_pct)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </ChartFrame>
          );
        })()}

      {mode === "analyst" &&
        changesSummary &&
        changesSummary.length > 0 &&
        (() => {
          const last12 = changesSummary.slice(-12);
          const totals = last12.map(
            (c) =>
              c.new_count +
              c.increased_count +
              c.decreased_count +
              c.closed_count,
          );
          const maxTotal = Math.max(...totals, 1);
          const yMax = Math.max(5, Math.ceil(maxTotal / 5) * 5);
          const hMain = 180;
          const yTicks = [yMax, Math.round(yMax / 2), 0];

          const netSeries = last12.map((c) => ({
            quarter: c.quarter,
            net:
              c.new_count +
              c.increased_count -
              (c.decreased_count + c.closed_count),
          }));
          const maxAbsNet = Math.max(
            ...netSeries.map((n) => Math.abs(n.net)),
            1,
          );
          const hNet = 60;
          const halfNet = hNet / 2;

          const compSeries = last12.map((c) => {
            const positive = c.new_count + c.increased_count;
            const negative = c.decreased_count + c.closed_count;
            const total = positive + negative;
            return { quarter: c.quarter, positive, negative, total };
          });
          const hComp = 64;

          return (
            <ChartFrame
              conclusionTitle={t("charts.changesSummaryTitle")}
              howToRead={t("charts.changesSummaryHowToRead")}
              footnote={t("charts.changesSummaryFootnote")}
            >
              {/* Total changes per quarter */}
              <div className="flex gap-1 items-end" style={{ height: hMain }}>
                <div className="flex flex-col justify-between h-full text-caption text-ink-tertiary pr-2 border-r border-grid shrink-0 w-10">
                  {yTicks.map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
                <div className="relative flex-1 h-full">
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    {yTicks.map((_, idx) => (
                      <div key={idx} className="w-full border-t border-grid" />
                    ))}
                  </div>
                  <div className="relative flex items-end gap-px h-full">
                    {last12.map((c, idx) => {
                      const total = totals[idx];
                      const barHeight = Math.max(2, (total / yMax) * hMain);
                      const tooltipValue = `Total: ${total} (New ${c.new_count} · +${c.increased_count} · −${c.decreased_count} · Closed ${c.closed_count})`;
                      return (
                        <UnifiedTooltip
                          key={c.quarter}
                          quarter={c.quarter}
                          value={tooltipValue}
                          className="relative flex-1 min-w-0 shrink-0 flex items-end"
                        >
                          <div
                            className="w-full bg-chart-1 rounded-t opacity-90 hover:opacity-100 transition-opacity"
                            style={{ height: barHeight }}
                          />
                        </UnifiedTooltip>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-caption text-ink-tertiary mt-1">
                {last12[0]?.quarter} → {last12[last12.length - 1]?.quarter}
              </p>

              {/* Net direction: (New + Increased) − (Decreased + Closed) */}
              <div className="mt-4">
                <div className="flex items-stretch gap-px" style={{ height: hNet }}>
                  {netSeries.map((n) => {
                    const barH = (Math.abs(n.net) / maxAbsNet) * halfNet;
                    const isPos = n.net >= 0;
                    const topSpacer = isPos ? halfNet - barH : halfNet;
                    const bottomSpacer = isPos ? halfNet : halfNet - barH;
                    return (
                      <UnifiedTooltip
                        key={n.quarter}
                        quarter={n.quarter}
                        value={`${
                          n.net >= 0 ? "+" : ""
                        }${n.net} = (New + Increased) − (Decreased + Closed)`}
                        className="relative flex-1 min-w-0 shrink-0 flex flex-col"
                      >
                        <div style={{ height: topSpacer, minHeight: 0 }} />
                        <div
                          className={`w-full shrink-0 ${
                            isPos
                              ? "bg-positive rounded-t"
                              : "bg-negative rounded-b"
                          }`}
                          style={{ height: barH }}
                        />
                        <div style={{ height: bottomSpacer, minHeight: 0 }} />
                      </UnifiedTooltip>
                    );
                  })}
                </div>
              </div>

              {/* Composition: positive (New+Increased) vs negative (Decreased+Closed) as 100% stack */}
              <div className="mt-4">
                <div className="flex items-end gap-px" style={{ height: hComp }}>
                  {compSeries.map((c) => {
                    const total = c.total || 1;
                    const posH = (c.positive / total) * hComp;
                    const negH = (c.negative / total) * hComp;
                    return (
                      <UnifiedTooltip
                        key={c.quarter}
                        quarter={c.quarter}
                        value={`+ (New+Increased): ${c.positive} · − (Decreased+Closed): ${c.negative}`}
                        className="relative flex-1 min-w-0 shrink-0 flex flex-col justify-end"
                      >
                        <div className="w-full flex flex-col justify-end h-full">
                          <div
                            className="bg-positive w-full shrink-0"
                            style={{ height: posH }}
                          />
                          <div
                            className="bg-negative w-full shrink-0"
                            style={{ height: negH }}
                          />
                        </div>
                      </UnifiedTooltip>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-2 text-caption text-ink-tertiary">
                  <span>
                    {last12[0]?.quarter} → {last12[last12.length - 1]?.quarter}
                  </span>
                  <div className="flex items-center gap-4 text-ink-secondary">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-positive" />
                      <span>
                        {t("quarter.changesNew")} /{" "}
                        {t("quarter.changesIncreased")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-negative" />
                      <span>
                        {t("quarter.changesDecreased")} /{" "}
                        {t("quarter.changesClosed")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </ChartFrame>
          );
        })()}

      {changesBoard && (
        <ChartFrame
          conclusionTitle={t("charts.storyActionsTitle", {
            largest_buy_name: changesBoard.largest_buy_name ?? "—",
            largest_sell_name: changesBoard.largest_sell_name ?? "—",
            new_count: changesBoard.new_count,
            exit_count: changesBoard.exit_count,
          })}
          howToRead={t("charts.storyActionsHowToRead")}
          footnote={t("charts.storyActionsFootnote")}
        >
          <QuarterMovesLeaderboard
            buys={changesBoard.buys ?? []}
            sells={changesBoard.sells ?? []}
            metric={changesMetric}
            onMetricChange={setChangesMetric}
          />
        </ChartFrame>
      )}

      {mode === "analyst" &&
        latestTopHoldings &&
        latestTopHoldings.length > 0 && (
          <TopHoldingsTable
            rows={latestTopHoldings}
            title={t("quarter.topHoldingsTitle", {
              n: String(latestTopHoldings.length),
            })}
            howToRead={t("quarter.topHoldingsHowToRead")}
          />
        )}

      {mode === "analyst" && data?.latest_quarter && fullHoldings && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-subtitle text-ink-primary">
              {t("explore.title")}
            </h2>
            <button
              type="button"
              className="text-caption text-accent hover:underline"
              onClick={() => setShowExplore((v) => !v)}
            >
              {showExplore
                ? t("explore.toggleCollapse")
                : t("explore.toggleExpand")}
            </button>
          </div>
          {showExplore && (
            <HoldingsExplorerTable
              rows={fullHoldings as any[]}
              onSelect={(id: string) => {
                window.location.href = `/holding/${encodeURIComponent(id)}`;
              }}
              title={t("explore.title")}
              searchPlaceholder={t("explore.searchPlaceholder")}
              labels={{
                rank: t("explore.columns.rank"),
                company: t("explore.columns.company"),
                weight: t("explore.columns.weight"),
                value: t("explore.columns.value"),
                deltaPct: t("explore.columns.deltaPct"),
                deltaUsd: t("explore.columns.deltaUsd"),
                tag: t("explore.columns.tag"),
                action: t("explore.columns.action"),
              }}
            />
          )}
        </section>
      )}

      {mode === "analyst" && artifacts.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-subtitle text-ink-primary">
            {t("download.title")}
          </h2>
          <p className="text-body text-ink-secondary">
            {t("download.intro")}
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full text-left text-caption">
              <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-ink-secondary">
                <tr>
                  <th className="px-3 py-2">{t("download.type")}</th>
                  <th className="px-3 py-2">{t("download.quarter")}</th>
                  <th className="px-3 py-2">{t("download.generated")}</th>
                  <th className="px-3 py-2">{t("download.status")}</th>
                  <th className="px-3 py-2 text-right">
                    {t("download.download")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {artifacts.slice(0, 8).map((a, idx) => (
                  <tr key={`${a.quarter}-${a.artifact_type}-${idx}`}>
                    <td className="px-3 py-1.5 text-ink-primary">
                      {a.artifact_type}
                    </td>
                    <td className="px-3 py-1.5 text-ink-secondary">
                      {a.quarter}
                    </td>
                    <td className="px-3 py-1.5 text-ink-tertiary">
                      {a.generated_at ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <span
                        className={`text-caption ${
                          a.validation_status === "PASS"
                            ? "text-positive"
                            : a.validation_status === "FAIL"
                            ? "text-negative"
                            : "text-ink-secondary"
                        }`}
                      >
                        {a.validation_status}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <a
                        href={a.download_url}
                        className="text-caption text-accent hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t("download.download")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === "analyst" && health && (
        <section className="space-y-2">
          <h2 className="text-subtitle text-ink-primary">
            {t("trust.title")}
          </h2>
          <ul className="list-disc list-inside text-body text-ink-secondary space-y-1">
            <li>{t("trust.point1")}</li>
            <li>{t("trust.point2")}</li>
            <li>{t("trust.point3")}</li>
          </ul>
          <div className="space-y-1 text-caption text-ink-secondary">
            <div>
              <span>
                {health.status === "ok" ? "✅" : "⚠️"} DB{" "}
                {health.db_ok ? "OK" : "degraded"}
              </span>
              {health.last_ingest_at && (
                <span className="ml-3">
                  Last ingest: {health.last_ingest_at} (
                  {health.last_ingest_status ?? "unknown"})
                </span>
              )}
            </div>
            {latestMeta && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-tertiary">
                  {latestMeta.quarter} validation:
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                    latestMeta.validation_status === "PASS"
                      ? "bg-green-50 text-positive dark:bg-green-900/20"
                      : latestMeta.validation_status === "FAIL"
                      ? "bg-red-50 text-negative dark:bg-red-900/20"
                      : "bg-zinc-100 text-ink-secondary dark:bg-zinc-800"
                  }`}
                >
                  {latestMeta.validation_status === "PASS" &&
                    t("trust.validation.pass")}
                  {latestMeta.validation_status === "WARN" &&
                    t("trust.validation.warn")}
                  {latestMeta.validation_status !== "PASS" &&
                    latestMeta.validation_status !== "WARN" &&
                    t("trust.validation.fail")}
                </span>
                {latestMeta.sec_filing_urls?.[0] && (
                  <a
                    href={latestMeta.sec_filing_urls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    {t("trust.secLink")}
                  </a>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {topHoldingsTs &&
        topHoldingsTs.series.length > 0 &&
        topHoldingsTs.quarters.length > 0 &&
        (() => {
          const { quarters, series } = topHoldingsTs;
          const hPx = 220;
          const yTicks = [100, 50, 0];
          // Top1 uses accent; Top2–Top5 use neutral chart colors
          const fillClasses = [
            "bg-accent",
            "bg-chart-2",
            "bg-chart-3",
            "bg-chart-4",
            "bg-chart-5",
          ];
          const lastIdx = quarters.length - 1;
          return mode === "analyst" ? (
            <ChartFrame
              conclusionTitle={t("charts.compositionTitle")}
              howToRead={t("charts.compositionHowToRead")}
              footnote={t("charts.compositionFootnote")}
            >
              <div className="flex gap-1 mt-1" style={{ height: hPx }}>
                <div className="flex flex-col justify-between h-full text-caption text-ink-tertiary pr-2 border-r border-grid shrink-0 w-10">
                  {yTicks.map((v) => (
                    <span key={v}>{v}%</span>
                  ))}
                </div>
                <div className="relative flex-1 h-full">
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                    {yTicks.map((_, idx) => (
                      <div key={idx} className="w-full border-t border-grid" />
                    ))}
                  </div>
                  <div className="relative flex items-end gap-px h-full">
                    {quarters.map((q, qi) => (
                      <UnifiedTooltip
                        key={q}
                        quarter={q}
                        value={series
                          .map((s) =>
                            `${s.issuer_name}: ${formatPct(
                              s.weights[qi] ?? 0,
                            )}`,
                          )
                          .join(" · ")}
                        className="relative flex-1 min-w-0 shrink-0 flex flex-col justify-end"
                      >
                        {series.map((s, si) => {
                          const w = s.weights[qi] ?? 0;
                          const heightPx = Math.round((w / 100) * hPx);
                          return (
                            <div
                              key={s.cusip}
                              className={`${
                                fillClasses[si] ?? "bg-chart-1"
                              } w-full shrink-0`}
                              style={{ height: heightPx }}
                            />
                          );
                        })}
                      </UnifiedTooltip>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start justify-between mt-2 gap-4">
                <p className="text-caption text-ink-tertiary">
                  {quarters[0]} → {quarters[quarters.length - 1]}
                </p>
                <div className="flex flex-wrap gap-3 text-caption text-ink-secondary">
                  {series.map((s, idx) => (
                    <div
                      key={s.cusip}
                      className="flex items-center gap-1 max-w-[14rem]"
                    >
                      <span
                        className={`inline-block w-3 h-3 rounded-sm ${
                          fillClasses[idx] ?? "bg-chart-1"
                        }`}
                      />
                      <span className="truncate">{s.issuer_name}</span>
                      <span className="text-ink-tertiary whitespace-nowrap">
                        {formatPct(s.weights[lastIdx] ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartFrame>
          ) : null;
        })()}
    </main>
  );
}

