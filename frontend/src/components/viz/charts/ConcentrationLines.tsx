"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import { useChartDimensions } from "@/components/viz/hooks";
import { UnifiedTooltip } from "@/components/viz/UnifiedTooltip";
import { formatPct, formatUSD } from "@/components/viz/format";

type ConcentrationPoint = {
  quarter: string;
  top1_pct: number;
  top5_pct: number;
  top10_pct: number;
};

interface ConcentrationLinesProps {
  data: ConcentrationPoint[];
  /** Optional map of quarter → total portfolio value, used to derive $ for tooltip. */
  totalsByQuarter?: Map<string, number>;
}

/**
 * Story Mode chart 2: Top1/Top5/Top10 concentration lines.
 */
export function ConcentrationLines({
  data,
  totalsByQuarter,
}: ConcentrationLinesProps) {
  const [containerRef, { width, height }] = useChartDimensions(256);

  const margin = { top: 8, right: 8, bottom: 24, left: 24 };
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 0);

  const processed = useMemo(
    () =>
      data.map((d, index) => ({
        index,
        ...d,
      })),
    [data],
  );

  const maxPct = useMemo(
    () =>
      d3.max(processed, (d) => Math.max(d.top1_pct, d.top5_pct, d.top10_pct)) ??
      100,
    [processed],
  );

  const yScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, Math.max(100, maxPct)])
        .nice()
        .range([innerHeight, 0]),
    [innerHeight, maxPct],
  );

  const xForIndex = (index: number): number => {
    if (processed.length <= 1) return innerWidth / 2;
    return (index / (processed.length - 1 || 1)) * innerWidth;
  };

  const buildLine = (accessor: (d: ConcentrationPoint) => number) =>
    d3
      .line<typeof processed[number]>()
      .x((d) => xForIndex(d.index))
      .y((d) => yScale(accessor(d)));

  const lineTop1 = useMemo(
    () => buildLine((d) => d.top1_pct)(processed) ?? "",
    [processed, yScale],
  );
  const lineTop5 = useMemo(
    () => buildLine((d) => d.top5_pct)(processed) ?? "",
    [processed, yScale],
  );
  const lineTop10 = useMemo(
    () => buildLine((d) => d.top10_pct)(processed) ?? "",
    [processed, yScale],
  );

  const yTicks = useMemo(
    () => yScale.ticks(4).filter((t) => t >= 0 && t <= 100),
    [yScale],
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Top1, Top5, and Top10 concentration over time"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid + y-axis */}
          {yTicks.map((t) => {
            const y = yScale(t);
            return (
              <g key={t} transform={`translate(0,${y})`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  className="stroke-grid"
                  strokeWidth={1}
                />
                <text
                  x={-4}
                  y={0}
                  dy="0.32em"
                  textAnchor="end"
                  className="text-caption fill-ink-tertiary"
                >
                  {`${t.toFixed(0)}%`}
                </text>
              </g>
            );
          })}

          {/* Lines */}
          {lineTop10 && (
            <path
              d={lineTop10}
              className="stroke-chart-3 fill-none"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}
          {lineTop5 && (
            <path
              d={lineTop5}
              className="stroke-chart-2 fill-none"
              strokeWidth={1.3}
              aria-hidden="true"
            />
          )}
          {lineTop1 && (
            <path
              d={lineTop1}
              className="stroke-accent fill-none"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          )}

          {/* Points + tooltips on latest 20 quarters */}
          {processed.map((d) => {
            const x = xForIndex(d.index);
            const totalForQuarter = totalsByQuarter?.get(d.quarter);
            const top1ValueUsd =
              typeof totalForQuarter === "number"
                ? formatUSD((d.top1_pct / 100) * totalForQuarter)
                : null;
            const top10ValueUsd =
              typeof totalForQuarter === "number"
                ? formatUSD((d.top10_pct / 100) * totalForQuarter)
                : null;

            return (
              <UnifiedTooltip
                key={d.quarter}
                quarter={d.quarter}
                valueUsd={totalForQuarter ?? undefined}
                weightPct={d.top10_pct}
                label={`Top1 ${formatPct(d.top1_pct)}, Top10 ${formatPct(
                  d.top10_pct,
                )}${
                  top10ValueUsd ? ` (${top10ValueUsd})` : ""
                }`}
                className="relative inline-block"
              >
                <g>
                  <circle
                    cx={x}
                    cy={yScale(d.top1_pct)}
                    r={3}
                    className="fill-accent stroke-bg-primary stroke-[1.5]"
                  />
                  <circle
                    cx={x}
                    cy={yScale(d.top10_pct)}
                    r={2}
                    className="fill-chart-3 stroke-bg-primary stroke-[1]"
                  />
                </g>
              </UnifiedTooltip>
            );
          })}

          {/* x-axis labels (sparse) */}
          {processed.map((d, index) => {
            const step =
              processed.length <= 12
                ? 1
                : processed.length <= 24
                ? 2
                : Math.max(1, Math.floor(processed.length / 8));
            const shouldShow =
              index === 0 ||
              index === processed.length - 1 ||
              index % step === 0;
            if (!shouldShow) return null;
            const x = xForIndex(index);
            return (
              <text
                key={d.quarter}
                x={x}
                y={innerHeight + 16}
                textAnchor="middle"
                className="text-caption fill-ink-tertiary"
              >
                {d.quarter}
              </text>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

