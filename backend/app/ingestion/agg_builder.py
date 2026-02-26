"""
Build holdings_agg from clean_df: rank, prev_quarter, deltas, change_type.
"""

from __future__ import annotations

import pandas as pd


def build_agg_for_quarter(
    clean_df: pd.DataFrame,
    quarter: str,
    prev_agg: pd.DataFrame | None,
) -> pd.DataFrame:
    """
    From clean_df (one quarter) build agg with rank, prev_*, delta_*, change_type.
    prev_agg: previous quarter's agg DataFrame (columns quarter, cusip, value_usd, weight_pct).
    """
    if clean_df.empty:
        return pd.DataFrame(
            columns=[
                "quarter",
                "cusip",
                "issuer_name",
                "ticker",
                "value_usd",
                "shares",
                "weight_pct",
                "rank",
                "prev_quarter",
                "prev_value_usd",
                "prev_weight_pct",
                "delta_value_usd",
                "delta_weight_pct",
                "change_type",
            ]
        )
    df = clean_df.sort_values("value_usd", ascending=False).reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)
    df["quarter"] = quarter
    df["shares"] = df["sshprnamt"] if "sshprnamt" in df.columns else 0
    df["ticker"] = df["ticker"] if "ticker" in df.columns else None
    prev_value = (
        prev_agg.set_index("cusip")["value_usd"].to_dict()
        if prev_agg is not None and not prev_agg.empty
        else {}
    )
    prev_weight = (
        prev_agg.set_index("cusip")["weight_pct"].to_dict()
        if prev_agg is not None and not prev_agg.empty
        else {}
    )
    prev_q = (
        prev_agg["quarter"].iloc[0]
        if prev_agg is not None and not prev_agg.empty
        else None
    )
    delta_val = []
    delta_pct = []
    change_types = []
    for _, row in df.iterrows():
        c = row["cusip"]
        v = row["value_usd"]
        w = row["weight_pct"]
        pv = prev_value.get(c)
        pw = prev_weight.get(c)
        if pv is None:
            delta_val.append(None)
            delta_pct.append(None)
            change_types.append("NEW")
        else:
            delta_val.append(v - pv)
            delta_pct.append(round(w - pw, 2) if pw is not None else None)
            if v > pv:
                change_types.append("INCREASED")
            elif v < pv:
                change_types.append("DECREASED")
            else:
                change_types.append("UNCHANGED")
    df["prev_quarter"] = prev_q
    df["prev_value_usd"] = df["cusip"].map(prev_value)
    df["prev_weight_pct"] = df["cusip"].map(prev_weight)
    df["delta_value_usd"] = delta_val
    df["delta_weight_pct"] = delta_pct
    df["change_type"] = change_types
    # Mark CLOSED in prev quarter (we don't have a row for closed in current agg; optional)
    out = df[
        [
            "quarter",
            "cusip",
            "issuer_name",
            "ticker",
            "value_usd",
            "shares",
            "weight_pct",
            "rank",
            "prev_quarter",
            "prev_value_usd",
            "prev_weight_pct",
            "delta_value_usd",
            "delta_weight_pct",
            "change_type",
        ]
    ].copy()
    return out
