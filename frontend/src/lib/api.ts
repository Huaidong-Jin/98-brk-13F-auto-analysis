const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchSummary(): Promise<any> {
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

export async function fetchQuarterHoldingsFull(quarter: string): Promise<
  {
    quarter: string;
    cusip: string;
    issuer_name: string;
    ticker: string | null;
    value_usd: number;
    shares: number;
    weight_pct: number;
    rank: number;
    prev_quarter: string | null;
    prev_value_usd: number | null;
    prev_weight_pct: number | null;
    delta_value_usd: number | null;
    delta_weight_pct: number | null;
    change_type: string | null;
  }[]
> {
  const r = await fetch(`${API_BASE}/api/v1/quarters/${quarter}/holdings_full`);
  if (!r.ok) throw new Error("Failed to fetch quarter holdings");
  return r.json();
}

export async function fetchChangesLeaderboard(
  quarter: string,
  sortMetric: "value_usd" | "weight_pct" = "value_usd",
): Promise<{
  quarter: string;
  compare_quarter: string | null;
  sort_metric: "value_usd" | "weight_pct";
  largest_buy_name: string | null;
  largest_sell_name: string | null;
  new_count: number;
  exit_count: number;
  buys: {
    issuer_name: string;
    cusip: string;
    ticker: string | null;
    weight_pct: number;
    value_usd: number;
    delta_pct: number;
    delta_usd: number;
    label: string;
  }[];
  sells: {
    issuer_name: string;
    cusip: string;
    ticker: string | null;
    weight_pct: number;
    value_usd: number;
    delta_pct: number;
    delta_usd: number;
    label: string;
  }[];
}> {
  const r = await fetch(
    `${API_BASE}/api/v1/quarters/${quarter}/changes_leaderboard?sort_metric=${sortMetric}`,
  );
  if (!r.ok) throw new Error("Failed to fetch changes leaderboard");
  return r.json();
}

export async function fetchChangesSummary(limit = 20): Promise<
  { quarter: string; new_count: number; increased_count: number; decreased_count: number; closed_count: number }[]
> {
  const r = await fetch(`${API_BASE}/api/v1/quarters/changes_summary?limit=${limit}`);
  if (!r.ok) throw new Error("Failed to fetch changes summary");
  return r.json();
}

export async function fetchTopHoldingsTimeseries(
  top = 5,
  quartersLimit = 20
): Promise<{ quarters: string[]; series: { issuer_name: string; cusip: string; weights: number[] }[] }> {
  const r = await fetch(
    `${API_BASE}/api/v1/summary/top_holdings_timeseries?top=${top}&quarters_limit=${quartersLimit}`
  );
  if (!r.ok) throw new Error("Failed to fetch top holdings timeseries");
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

export async function fetchHealth(): Promise<{
  status: string;
  db_ok: boolean;
  drive_ok: boolean | null;
  last_ingest_at: string | null;
  last_ingest_status: string | null;
}> {
  const r = await fetch(`${API_BASE}/api/v1/health`);
  if (!r.ok) throw new Error("Failed to fetch health");
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
