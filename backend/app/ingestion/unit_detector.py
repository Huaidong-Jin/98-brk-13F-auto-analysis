"""
Detect 13F value unit per quarter: $thousands (mult 1000) vs $ (mult 1).
Dual check: portfolio total in [50B, 800B] and implied price median in [1, 20000].
"""

from __future__ import annotations

import numpy as np
import pandas as pd

DEFAULT_PORTFOLIO_RANGE = (50e9, 800e9)
DEFAULT_IMPLIED_PRICE_RANGE = (1.0, 20_000.0)


def detect_unit_multiplier_per_quarter(
    df_q: pd.DataFrame,
    portfolio_range: tuple[float, float] = DEFAULT_PORTFOLIO_RANGE,
    implied_price_range: tuple[float, float] = DEFAULT_IMPLIED_PRICE_RANGE,
) -> tuple[int, str]:
    """
    Return (multiplier, reason). multiplier is 1000 (value in $thousands) or 1 (value in $).
    """
    total_raw = df_q["value_raw"].sum()
    if total_raw <= 0:
        return 1000, "default_thousands_no_data"
    # implied price = value / shares; avoid div by zero
    shares = df_q["sshprnamt"].replace(0, np.nan)
    valid = shares.notna() & (shares > 0)
    if not valid.any():
        return 1000, "default_thousands_no_shares"
    pass_1000_total = portfolio_range[0] <= (total_raw * 1000) <= portfolio_range[1]
    pass_1_total = portfolio_range[0] <= (total_raw * 1) <= portfolio_range[1]
    implied_1000 = df_q.loc[valid, "value_raw"] * 1000 / df_q.loc[valid, "sshprnamt"]
    implied_1 = df_q.loc[valid, "value_raw"] * 1 / df_q.loc[valid, "sshprnamt"]
    med_1000 = float(implied_1000.median())
    med_1 = float(implied_1.median())
    pass_1000_price = implied_price_range[0] <= med_1000 <= implied_price_range[1]
    pass_1_price = implied_price_range[0] <= med_1 <= implied_price_range[1]
    if pass_1000_total and pass_1000_price and not (pass_1_total and pass_1_price):
        return 1000, "thousands_by_total_and_implied_price"
    if pass_1_total and pass_1_price and not (pass_1000_total and pass_1000_price):
        return 1, "dollars_by_total_and_implied_price_warn"
    if pass_1000_total and pass_1000_price:
        return 1000, "thousands_preferred_when_both_pass"
    if not (pass_1000_total or pass_1_total) and not (pass_1000_price or pass_1_price):
        return 1000, "fail_both_candidates_using_thousands"
    if pass_1000_total and pass_1000_price:
        return 1000, "thousands"
    return 1, "dollars_fallback"
