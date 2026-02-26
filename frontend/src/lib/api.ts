const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSummary() {
  const r = await fetch(`${API_BASE}/api/v1/summary`);
  if (!r.ok) throw new Error("Failed to fetch summary");
  return r.json();
}

export async function fetchQuarters() {
  const r = await fetch(`${API_BASE}/api/v1/quarters`);
  if (!r.ok) throw new Error("Failed to fetch quarters");
  return r.json();
}

export async function fetchQuarterDetail(quarter: string) {
  const r = await fetch(`${API_BASE}/api/v1/quarters/${quarter}`);
  if (!r.ok) throw new Error("Failed to fetch quarter");
  return r.json();
}

export async function fetchHolding(cusipOrTicker: string) {
  const r = await fetch(`${API_BASE}/api/v1/holdings/${encodeURIComponent(cusipOrTicker)}`);
  if (!r.ok) throw new Error("Failed to fetch holding");
  return r.json();
}

export async function fetchArtifacts() {
  const r = await fetch(`${API_BASE}/api/v1/artifacts`);
  if (!r.ok) throw new Error("Failed to fetch artifacts");
  return r.json();
}

export function formatUSD(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPct(value: number, decimals = 1): string {
  return `${Number(value).toFixed(decimals)}%`;
}
