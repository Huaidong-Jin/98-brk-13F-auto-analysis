"use client";

import Link from "next/link";
import { formatUSD, formatPct } from "@/lib/api";

export type TopHoldingRow = {
  issuer_name: string;
  cusip: string;
  value_usd: number;
  weight_pct: number;
  rank: number;
};

interface TopHoldingsTableProps {
  rows: TopHoldingRow[];
  title: string;
  howToRead: string;
  footnote?: string;
}

/**
 * Reusable Top N holdings table used in Analyst Mode and quarter detail.
 */
export function TopHoldingsTable({
  rows,
  title,
  howToRead,
  footnote,
}: TopHoldingsTableProps) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-subtitle text-ink-primary">{title}</h2>
        <p className="text-caption text-ink-secondary">{howToRead}</p>
      </header>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-left text-caption">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-ink-secondary">
            <tr>
              <th className="px-3 py-2 w-12">#</th>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2">Weight</th>
              <th className="px-3 py-2">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rows.map((h) => (
              <tr
                key={h.cusip}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              >
                <td className="px-3 py-1.5 text-ink-tertiary">{h.rank}</td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/holding/${h.cusip}`}
                    className="text-ink-primary hover:text-accent"
                  >
                    {h.issuer_name}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-ink-secondary">
                  {formatPct(h.weight_pct)}
                </td>
                <td className="px-3 py-1.5 text-ink-secondary">
                  {formatUSD(h.value_usd)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-ink-tertiary"
                >
                  No holdings.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {footnote && (
        <p className="text-caption text-ink-tertiary">{footnote}</p>
      )}
    </section>
  );
}

