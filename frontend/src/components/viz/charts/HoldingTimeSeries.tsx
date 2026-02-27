"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import { useChartDimensions } from "@/components/viz/hooks";
import { UnifiedTooltip } from "@/components/viz/UnifiedTooltip";
import { formatPct, formatUSD } from "@/components/viz/format";

type HoldingPoint = {
  quarter: string;
  value_usd: number;
  weight_pct: number;
};

export type HoldingSeriesMode = "pct" | "usd";

interface HoldingTimeSeriesProps {
  data: HoldingPoint[];
  mode: HoldingSeriesMode;
}

/**
 * D3-based time series for a single holding's weight (%) or value ($B).
 */
export function HoldingTimeSeries({ data, mode }: HoldingTimeSeriesProps) {
  const [containerRef, { width, height }] = useChartDimensions(240);

  const margin = { top: 8, right: 8, bottom: 24, left: 32 };
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 0);

  const processed = useMemo(
    () =>
      data.map((d, index) => ({
        index,
        quarter: d.quarter,
        value: mode === "pct" ? d.weight_pct : d.value_usd / 1e9,
        raw: d,
      })),
    [data, mode],
  );

  const maxValue = useMemo(
    () => d3.max(processed, (d) => d.value) ?? 0,
    [processed],
  );

  const yScale = useMemo(
    () =>
      d3
        .scaleLinear()
        .domain([0, maxValue || 1])
        .nice()
        .range([innerHeight, 0]),
    [innerHeight, maxValue],
  );

  const xForIndex = (index: number): number => {
    if (processed.length <= 1) return innerWidth / 2;
    return (index / (processed.length - 1 || 1)) * innerWidth;
  };

  const linePath = useMemo(() => {
    const line = d3
      .line<typeof processed[number]>()
      .x((d) => xForIndex(d.index))
      .y((d) => yScale(d.value));
    return line(processed) ?? "";
  }, [processed, yScale]);

  const yTicks = useMemo(
    () => yScale.ticks(4).filter((t) => t >= 0),
    [yScale],
  );

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Holding time series"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {yTicks.map((t) => {
            const y = yScale(t);
            const label =
              mode === "pct"
                ? `${t.toFixed(1)}%`
                : `$${t.toFixed(1)}B`;
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
                  {label}
                </text>
              </g>
            );
          })}

          {linePath && (
            <path
              d={linePath}
              className="stroke-accent fill-none"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          )}

          {processed.map((d) => {
            const x = xForIndex(d.index);
            const y = yScale(d.value);
            const tooltipValue =
              mode === "pct"
                ? formatPct(d.raw.weight_pct)
                : `${formatUSD(d.raw.value_usd)}`;

            return (
              <UnifiedTooltip
                key={d.quarter}
                quarter={d.quarter}
                valueUsd={mode === "usd" ? d.raw.value_usd : undefined}
                weightPct={mode === "pct" ? d.raw.weight_pct : undefined}
                className="relative inline-block"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  className="fill-accent stroke-bg-primary stroke-[1.5]"
                >
                  <title>{tooltipValue}</title>
                </circle>
              </UnifiedTooltip>
            );
          })}

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

