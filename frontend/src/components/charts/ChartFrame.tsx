"use client";

import { type ReactNode } from "react";

export interface ChartFrameProps {
  conclusionTitle: string;
  howToRead: string;
  footnote?: string;
  children: ReactNode;
  exportable?: boolean;
}

export function ChartFrame({
  conclusionTitle,
  howToRead,
  footnote,
  children,
  exportable = true,
}: ChartFrameProps) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h3 className="text-title text-ink-primary mb-1">{conclusionTitle}</h3>
      <p className="text-caption text-ink-secondary mb-4">{howToRead}</p>
      <div className="min-h-[280px]">{children}</div>
      {footnote && (
        <p className="text-caption text-ink-tertiary mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {footnote}
        </p>
      )}
    </section>
  );
}
