"use client";

import type { ReactNode } from "react";
import {
  ChartFrame as BaseChartFrame,
  type ChartFrameProps as BaseChartFrameProps,
} from "@/components/charts/ChartFrame";

export interface ChartFrameProps extends BaseChartFrameProps {
  /** Optional actions slot rendered next to the export button. */
  actions?: ReactNode;
}

/**
 * Thin wrapper around the legacy ChartFrame component.
 *
 * New D3 charts should import this version from `components/viz/ChartFrame`
 * so we have a single place to evolve the frame (actions menu, density
 * presets, etc.) without touching each chart.
 */
export function ChartFrame({ actions, ...rest }: ChartFrameProps) {
  // For now we simply delegate; actions are ignored until the header layout
  // is extended. This keeps the migration incremental.
  return <BaseChartFrame {...rest} />;
}

