"use client";

import { useEffect, useState } from "react";
import { fetchArtifacts } from "@/lib/api";

export default function DownloadPage() {
  const [artifacts, setArtifacts] = useState<{ artifact_type: string; quarter: string; generated_at: string | null; validation_status: string; download_url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArtifacts()
      .then(setArtifacts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-body text-ink-secondary">Loading...</p>;
  if (error) return <p className="text-body text-negative">Error: {error}</p>;

  return (
    <main className="space-y-8">
      <h1 className="text-display text-ink-primary">Download center</h1>
      <p className="text-body text-ink-secondary">
        All artifacts: raw CSV, cleaned CSV, agg CSV, meta JSON. Each row shows quarter, generation time, and validation status.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-body text-left">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-4 text-label text-ink-tertiary">Type</th>
              <th className="py-2 pr-4 text-label text-ink-tertiary">Quarter</th>
              <th className="py-2 pr-4 text-label text-ink-tertiary">Generated</th>
              <th className="py-2 pr-4 text-label text-ink-tertiary">Status</th>
              <th className="py-2 text-label text-ink-tertiary">Download</th>
            </tr>
          </thead>
          <tbody>
            {artifacts.map((a, i) => (
              <tr key={`${a.quarter}-${a.artifact_type}-${i}`} className="border-b border-zinc-100 dark:border-zinc-800/50">
                <td className="py-2 pr-4 text-ink-primary">{a.artifact_type}</td>
                <td className="py-2 pr-4 text-ink-secondary">{a.quarter}</td>
                <td className="py-2 pr-4 text-ink-tertiary text-caption">{a.generated_at ?? "—"}</td>
                <td className="py-2 pr-4">
                  <span className={`text-caption ${a.validation_status === "PASS" ? "text-positive" : a.validation_status === "FAIL" ? "text-negative" : "text-ink-secondary"}`}>
                    {a.validation_status}
                  </span>
                </td>
                <td className="py-2">
                  <a href={a.download_url} className="text-caption text-accent hover:underline" target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {artifacts.length === 0 && (
        <p className="text-body text-ink-tertiary">No artifacts yet. Run the backend ingest pipeline to generate files.</p>
      )}
    </main>
  );
}
