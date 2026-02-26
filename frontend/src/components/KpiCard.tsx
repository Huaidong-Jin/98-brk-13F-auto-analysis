import type { ReactNode } from "react";

type KpiCardProps = {
  title: ReactNode;
  primary: ReactNode;
  secondary?: ReactNode;
  description?: ReactNode;
};

export function KpiCard({ title, primary, secondary, description }: KpiCardProps) {
  return (
    <div className="flex-1 min-w-[12rem] rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="text-caption text-ink-tertiary mb-1">{title}</div>
      <div className="text-title font-semibold text-ink-primary">{primary}</div>
      {secondary && (
        <div className="text-caption text-ink-secondary mt-0.5">{secondary}</div>
      )}
      {description && (
        <p className="text-body text-ink-secondary mt-2 leading-snug">{description}</p>
      )}
    </div>
  );
}

