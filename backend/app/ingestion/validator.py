"""
Automated validation: total_value range, implied price median, weight sum, quarter coverage.
Results go into filing_meta.validation_details.
"""

from __future__ import annotations

from typing import Any

import pandas as pd

TOTAL_VALUE_RANGE = (50e9, 800e9)
IMPLIED_PRICE_RANGE = (1.0, 20_000.0)
WEIGHT_SUM_RANGE = (99.5, 100.5)


def validate_quarter(
    df_q: pd.DataFrame,
    total_value_usd: float,
    weight_sum_pct: float,
    implied_price_median: float,
    num_quarters_expected: int = 40,
    quarters_present: list[str] | None = None,
) -> tuple[str, dict[str, Any]]:
    """
    Returns (validation_status, validation_details).
    status: PASS | WARN | FAIL.
    """
    details: dict[str, Any] = {}
    status = "PASS"
    # 1) total_value in range
    if total_value_usd < TOTAL_VALUE_RANGE[0] or total_value_usd > TOTAL_VALUE_RANGE[1]:
        details["total_value_usd"] = {
            "expected": list(TOTAL_VALUE_RANGE),
            "actual": total_value_usd,
            "result": "FAIL",
        }
        status = "FAIL"
    else:
        details["total_value_usd"] = {"result": "PASS", "actual": total_value_usd}
    # 2) implied price median
    if (
        implied_price_median < IMPLIED_PRICE_RANGE[0]
        or implied_price_median > IMPLIED_PRICE_RANGE[1]
    ):
        details["implied_price_median"] = {
            "expected": list(IMPLIED_PRICE_RANGE),
            "actual": implied_price_median,
            "result": "WARN",
        }
        if status != "FAIL":
            status = "WARN"
    else:
        details["implied_price_median"] = {
            "result": "PASS",
            "actual": implied_price_median,
        }
    # 3) weight sum
    if not (WEIGHT_SUM_RANGE[0] <= weight_sum_pct <= WEIGHT_SUM_RANGE[1]):
        details["weight_sum_pct"] = {
            "expected": list(WEIGHT_SUM_RANGE),
            "actual": weight_sum_pct,
            "result": "FAIL",
        }
        status = "FAIL"
    else:
        details["weight_sum_pct"] = {"result": "PASS", "actual": weight_sum_pct}
    # 4) quarter coverage (caller can pass quarters_present vs expected)
    if quarters_present is not None and len(quarters_present) < num_quarters_expected:
        missing = num_quarters_expected - len(quarters_present)
        details["quarter_coverage"] = {
            "result": "WARN",
            "expected_min": num_quarters_expected,
            "actual": len(quarters_present),
            "missing": missing,
        }
        if status == "PASS":
            status = "WARN"
    else:
        details["quarter_coverage"] = {"result": "PASS"}
    return status, details
