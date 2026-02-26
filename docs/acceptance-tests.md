# Acceptance tests (DoD)

## Data correctness (§4.1)

- **Unit detection**: For each quarter, `total_value_usd_norm` is in [$50B, $800B]; else WARN/FAIL with reason. Automated in `validator.py` and CI `scripts/validate_data.py`.
- **Implied price**: Median(value/shares) in [$1, $20,000]; else WARN/FAIL. In `validation_details`.
- **Weight sum**: Per-quarter weight sum in [99.5%, 100.5%]. FAIL if outside. Automated in normalizer + validator.
- **Quarter coverage**: Recent 10 years expect up to 40 quarters; missing quarters listed in validation_details; FAIL if unexpected gap.
- **Merge logic**: If RESTATEMENT exists for a quarter, meta.used_accessions reflects the restatement accession. If NEW HOLDINGS, final count >= base or merged as per plan. Recorded in meta.
- **Traceability**: Each quarter meta has `used_accessions`, `amendment_types`, `unit_multiplier`, `unit_reason`, `sec_filing_urls`, timestamp.

## Frontend (§4.2)

- **LCP**: Home first screen LCP < 2.5s (production, mobile throttling). Measure with Lighthouse.
- **Interaction**: Hover/tooltip response < 100ms.
- **10-second test**: For each chart, a non-finance user can answer "What does this chart show?" in ≤10s without prior explanation. Document the question and expected answer in this file:
  - Portfolio value chart: "Total value of Berkshire’s reported 13F holdings over time."
  - Concentration chart: "How much of the portfolio is in the top 1, 5, and 10 holdings."
  - Top holdings bar: "Largest positions this quarter by value and weight."
  - Holding time series: "This stock’s share of the portfolio (or dollar value) over time."
- **Accessibility**: Color contrast WCAG AA; charts have a short text summary (e.g. in ChartFrame or aria-label).
- **Consistency**: Same type scale, spacing, and chart token set across pages.

## Operations (§4.3)

- **Logging**: Each ingest emits structured log: start, end, duration_s, new_filings, success count, failed count.
- **Alerts**: On ingest FAIL, Drive write failure, or fetch HTTP 5xx, send Slack or email alert.
- **CI**: `scripts/validate_data.py` and `scripts/lint_charts.js` (or equivalent) run on merge; lint and no hardcoded hex in frontend.
