"use client";

import { useMemo } from "react";
import * as d3 from "d3";
import { useChartDimensions } from "@/components/viz/hooks";
import { UnifiedTooltip } from "@/components/viz/UnifiedTooltip";
import { formatUSD } from "@/components/viz/format";
import { computePeakAndTrough } from "@/components/viz/annotations";

type PortfolioPoint = {
  quarter: string;
  total_value_usd: number;
};

interface PortfolioValueAreaProps {
  data: PortfolioPoint[];
}

/**
 * Story Mode chart 1: portfolio value over time.
 *
 * D3 is used for the y-scale and area/line path generation; layout is handled
 * via a responsive SVG with a fixed aspect ratio.
 */
export function PortfolioValueArea({ data }: PortfolioValueAreaProps) {
  const [containerRef, { width, height }] = useChartDimensions(240);

  const margin = { top: 8, right: 8, bottom: 24, left: 0 };
  const innerWidth = Math.max(width - margin.left - margin.right, 0);
  const innerHeight = Math.max(height - margin.top - margin.bottom, 0);

  const processed = useMemo(
    () =>
      data.map((d, index) => ({
        index,
        quarter: d.quarter,
        value: d.total_value_usd,
      })),
    [data],
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

  const areaPath = useMemo(() => {
    const area = d3
      .area<{ index: number; value: number }>()
      .x((d) => xForIndex(d.index))
      .y0(innerHeight)
      .y1((d) => yScale(d.value));
    return area(processed) ?? "";
  }, [innerHeight, processed, yScale]);

  const linePath = useMemo(() => {
    const line = d3
      .line<{ index: number; value: number }>()
      .x((d) => xForIndex(d.index))
      .y((d) => yScale(d.value));
    return line(processed) ?? "";
  }, [processed, yScale]);

  const yTicks = useMemo(
    () => yScale.ticks(3).filter((t) => t >= 0),
    [yScale],
  );

  const annotations = useMemo(() => {
    const base = processed.map((p) => ({
      quarter: p.quarter,
      value: p.value,
    }));
    const extremums = computePeakAndTrough(base);
    const latest =
      processed.length > 0
        ? {
            type: "latest" as const,
            quarter: processed[processed.length - 1].quarter,
            value: processed[processed.length - 1].value,
          }
        : null;
    return { extremums, latest };
  }, [processed]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Portfolio value over time"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Grid + y-axis labels */}
          {yTicks.map((t) => {
            const y = yScale(t);
            const billions = t / 1e9;
            return (
              <g key={t} transform={`translate(0,${y})`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  className="stroke-grid"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={0}
                  dy="-0.25em"
                  className="text-caption fill-ink-tertiary"
                >
                  {`$${billions.toFixed(0)}B`}
                </text>
              </g>
            );
          })}

          {/* Area + line */}
          {areaPath && (
            <path
              d={areaPath}
              className="fill-accent/20 stroke-none"
              aria-hidden="true"
            />
          )}
          {linePath && (
            <path
              d={linePath}
              className="stroke-accent fill-none"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}

          {/* Points + tooltips */}
          {processed.map((d) => {
            const x = xForIndex(d.index);
            const y = yScale(d.value);
            return (
              <UnifiedTooltip
                key={d.quarter}
                quarter={d.quarter}
                valueUsd={d.value}
                className="relative inline-block"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={3}
                  className="fill-accent stroke-bg-primary stroke-[1.5]"
                />
              </UnifiedTooltip>
            );
          })}

          {/* Annotations: peak, trough, latest */}
          {annotations.extremums.map((a) => {
            const idx = processed.findIndex((p) => p.quarter === a.quarter);
            if (idx === -1) return null;
            const x = xForIndex(idx);
            const y = yScale(a.value);
            const label =
              a.type === "peak"
                ? "Peak"
                : "Trough";
            const offsetY = a.type === "peak" ? -12 : 14;
            return (
              <g key={`${a.type}-${a.quarter}`} transform={`translate(${x},${y})`}>
                <circle
                  r={4}
                  className="fill-accent stroke-bg-primary stroke-[1.5]"
                />
                <text
                  x={0}
                  y={offsetY}
                  textAnchor="middle"
                  className="text-caption fill-ink-secondary"
                >
                  {label}
                </text>
              </g>
            );
          })}
          {annotations.latest && (() => {
            const idx = processed.findIndex(
              (p) => p.quarter === annotations.latest?.quarter,
            );
            if (idx === -1) return null;
            const x = xForIndex(idx);
            const y = yScale(annotations.latest.value);
            return (
              <g
                key={`latest-${annotations.latest.quarter}`}
                transform={`translate(${x},${y})`}
              >
                <circle
                  r={4}
                  className="fill-accent stroke-bg-primary stroke-[1.5]"
                />
                <text
                  x={0}
                  y={-16}
                  textAnchor="middle"
                  className="text-caption fill-ink-secondary"
                >
                  Latest
                </text>
              </g>
            );
          })()}

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

