"""
Merge 13F-HR and 13F-HR/A amendments per plan §4.
Key: (cusip, putcall). RESTATEMENT replaces; NEW HOLDINGS merge (same key replace, new key append).
"""

from __future__ import annotations

from typing import Any

import pandas as pd


def _merge_key(row: pd.Series) -> tuple[str, str]:
    return (str(row["cusip"]), str(row.get("putcall") or ""))


def merge_amendments(
    base_df: pd.DataFrame,
    base_accession: str,
    amendments: list[tuple[str, str, pd.DataFrame]],
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Merge base + amendments in order. Each amendment is (accession, amendment_type, df).
    Returns (final_df, meta_dict) with used_accessions and amendment_types.
    """
    used: list[str] = [base_accession]
    types_used: list[str] = ["13F-HR"]
    current = base_df.copy()
    for acc, amendment_type, amend_df in amendments:
        if not len(amend_df):
            continue
        row_count = len(amend_df)
        # RESTATEMENT or (NEW HOLDINGS and row_count >= 20) or (null and row_count >= 20): replace
        is_full_replace = (
            amendment_type == "RESTATEMENT"
            or (amendment_type == "NEW HOLDINGS" and row_count >= 20)
            or (
                amendment_type is None
                or (isinstance(amendment_type, str) and amendment_type.strip() == "")
                and row_count >= 20
            )
        )
        if is_full_replace:
            current = amend_df.copy()
            used = [acc]
            types_used = [amendment_type or "FULL_REPLACE"]
            continue
        # Incremental: merge by (cusip, putcall)
        amend_keys = set(_merge_key(amend_df.loc[i]) for i in amend_df.index)
        current_keys = set(_merge_key(current.loc[i]) for i in current.index)
        # Drop from current all keys that appear in amend; then append amend
        to_drop = current_keys & amend_keys
        if to_drop:

            def keep_row(i: int) -> bool:
                return _merge_key(current.loc[i]) not in to_drop

            current = current.loc[[i for i in current.index if keep_row(i)]].copy()
        current = pd.concat([current, amend_df], ignore_index=True)
        used.append(acc)
        types_used.append(amendment_type or "NEW HOLDINGS")
    meta = {"used_accessions": used, "amendment_types": types_used}
    return current, meta
