"""Tests for unit_detector."""

import pandas as pd
import pytest

from app.ingestion.unit_detector import detect_unit_multiplier_per_quarter


def test_thousands_detected():
    """Value in $thousands: total 100M*1000=100B, implied price 10000 -> mult 1000."""
    df = pd.DataFrame(
        {
            "value_raw": [60_000_000, 40_000_000],
            "sshprnamt": [6_000_000, 4_000_000],
        }
    )
    mult, reason = detect_unit_multiplier_per_quarter(df)
    assert mult == 1000
    assert "1000" in reason or "thousand" in reason.lower()


def test_fail_out_of_range():
    """Total way out of range may still default to 1000."""
    df = pd.DataFrame(
        {
            "value_raw": [1, 2],
            "sshprnamt": [1, 1],
        }
    )
    mult, _ = detect_unit_multiplier_per_quarter(df)
    assert mult in (1, 1000)
