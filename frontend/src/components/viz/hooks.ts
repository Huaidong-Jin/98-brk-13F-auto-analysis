"use client";

import { useEffect, useRef, useState } from "react";

export interface ChartDimensions {
  width: number;
  height: number;
}

/**
 * Minimal responsive SVG hook: measures the parent container once on mount
 * and updates on resize. Keeps charts decoupled from fixed pixel sizes.
 */
export function useChartDimensions(
  defaultHeight: number,
): [React.RefObject<HTMLDivElement | null>, ChartDimensions] {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState<ChartDimensions>({
    width: 800,
    height: defaultHeight,
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function update() {
      const rect = el!.getBoundingClientRect();
      if (!rect.width) return;
      setDims({ width: rect.width, height: defaultHeight });
    }

    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [defaultHeight]);

  return [containerRef, dims];
}

