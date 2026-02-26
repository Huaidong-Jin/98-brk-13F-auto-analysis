"""
Normalize merged quarter DF: value_usd, total_value_usd_q, weight_pct (sum ≈ 100%).
"""

from __future__ import annotations

import pandas as pd


def normalize_and_recompute_weights(
    df_q: pd.DataFrame,
    unit_multiplier: int,
    unit_reason: str = "",
) -> pd.DataFrame:
    """
    Add value_usd, total_value_usd_q, weight_pct, unit_reason. Weights sum to 100% per quarter.
    """
    out = df_q.copy()
    out["value_usd"] = (out["value_raw"].astype(float) * unit_multiplier).round(2)
    total = out["value_usd"].sum()
    out["total_value_usd_q"] = total
    out["weight_pct"] = (out["value_usd"] / total * 100).round(2) if total else 0.0
    out["unit_multiplier"] = unit_multiplier
    out["unit_reason"] = unit_reason
    if "ticker" not in out.columns:
        out["ticker"] = None
    return out
