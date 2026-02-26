"use client";

import { useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/context";

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
  const { t } = useLocale();
  const sectionRef = useRef<HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExportPng() {
    if (!sectionRef.current || !exportable) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(sectionRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `chart-${conclusionTitle.replace(/\s+/g, "-").slice(0, 40)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Chart export failed", e);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section
      ref={sectionRef}
      className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-title text-ink-primary mb-1">{conclusionTitle}</h3>
          <p className="text-caption text-ink-secondary mb-4">{howToRead}</p>
        </div>
        {exportable && (
          <button
            type="button"
            onClick={handleExportPng}
            disabled={exporting}
            className="text-caption text-ink-secondary hover:text-accent border border-grid rounded px-2 py-1 shrink-0 disabled:opacity-50"
          >
            {exporting ? "…" : t("charts.exportPng")}
          </button>
        )}
      </div>
      <div className="min-h-[280px]">{children}</div>
      {footnote && (
        <p className="text-caption text-ink-tertiary mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          {footnote}
        </p>
      )}
    </section>
  );
}
