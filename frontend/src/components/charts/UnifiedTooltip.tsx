"use client";

import { type ReactNode, useState } from "react";

export interface UnifiedTooltipProps {
  quarter: string;
  value: string;
  children: ReactNode;
  /** Override the wrapper div className (default: "relative inline-block w-full h-full min-w-0") */
  className?: string;
}

/**
 * Wraps a chart element and shows a consistent tooltip on hover:
 * quarter + value (with unit). Complements native title for a11y.
 */
export function UnifiedTooltip({
  quarter,
  value,
  children,
  className = "relative inline-block w-full h-full min-w-0",
}: UnifiedTooltipProps) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  return (
    <div
      className={className}
      onMouseEnter={(e) => {
        setShow(true);
        const rect = e.currentTarget.getBoundingClientRect();
        setCoords({ x: rect.left + rect.width / 2, y: rect.top });
      }}
      onMouseLeave={() => setShow(false)}
      onMouseMove={(e) => setCoords({ x: e.clientX, y: e.clientY })}
    >
      {children}
      {show && (
        <div
          className="fixed z-50 px-2 py-1.5 rounded bg-zinc-800 text-white text-caption shadow-lg pointer-events-none"
          style={{
            left: Math.min(coords.x, typeof window !== "undefined" ? window.innerWidth - 120 : coords.x),
            top: coords.y - 36,
            transform: "translate(-50%, 0)",
          }}
        >
          <span className="font-medium">{quarter}</span>
          <span className="ml-1 text-zinc-300">{value}</span>
        </div>
      )}
    </div>
  );
}

/** Format tooltip line for use in native title (a11y). */
export function formatChartTooltip(quarter: string, value: string): string {
  return `${quarter}: ${value}`;
}
