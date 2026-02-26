"""Tests for merge_amendments."""

import pandas as pd
import pytest

from app.ingestion.merger import merge_amendments


def test_merge_base_only():
    """Only base, no amendments."""
    base = pd.DataFrame(
        [
            {
                "cusip": "A",
                "putcall": None,
                "value_raw": 100,
                "issuer_name": "Issuer A",
            },
            {"cusip": "B", "putcall": "", "value_raw": 200, "issuer_name": "Issuer B"},
        ]
    )
    final, meta = merge_amendments(base, "acc-001", [])
    assert len(final) == 2
    assert meta["used_accessions"] == ["acc-001"]
    assert meta["amendment_types"] == ["13F-HR"]


def test_merge_restatement_replaces():
    """RESTATEMENT replaces entire quarter."""
    base = pd.DataFrame(
        [{"cusip": "A", "putcall": None, "value_raw": 100, "issuer_name": "A"}]
    )
    restate = pd.DataFrame(
        [
            {"cusip": "X", "putcall": None, "value_raw": 50, "issuer_name": "X"},
            {"cusip": "Y", "putcall": None, "value_raw": 50, "issuer_name": "Y"},
        ]
    )
    final, meta = merge_amendments(
        base, "acc-001", [("acc-002", "RESTATEMENT", restate)]
    )
    assert len(final) == 2
    assert set(final["cusip"]) == {"X", "Y"}
    assert meta["used_accessions"] == ["acc-002"]
    assert (
        "FULL_REPLACE" in meta["amendment_types"]
        or "RESTATEMENT" in meta["amendment_types"]
    )


def test_merge_new_holdings_incremental():
    """NEW HOLDINGS with few rows: merge by key."""
    base = pd.DataFrame(
        [
            {"cusip": "A", "putcall": None, "value_raw": 100, "issuer_name": "A"},
            {"cusip": "B", "putcall": None, "value_raw": 200, "issuer_name": "B"},
        ]
    )
    amend = pd.DataFrame(
        [
            {
                "cusip": "A",
                "putcall": None,
                "value_raw": 150,
                "issuer_name": "A updated",
            },
            {"cusip": "C", "putcall": None, "value_raw": 50, "issuer_name": "C"},
        ]
    )
    final, meta = merge_amendments(
        base, "acc-001", [("acc-002", "NEW HOLDINGS", amend)]
    )
    assert len(final) == 3
    a_row = final[final["cusip"] == "A"].iloc[0]
    assert a_row["value_raw"] == 150
    assert "C" in final["cusip"].values
    assert "acc-002" in meta["used_accessions"]
