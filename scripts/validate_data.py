#!/usr/bin/env python3
"""
CI gate: run validator checks on the latest clean CSV (or DB).
Exits 0 if all pass/warn; 1 if any FAIL or file missing.
"""
import os
import sys
from pathlib import Path

# Add backend to path
repo = Path(__file__).resolve().parent.parent
backend = repo / "backend"
sys.path.insert(0, str(backend))
os.chdir(backend)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./data/brk13f.db")


def main() -> int:
    from app.ingestion.validator import validate_quarter
    import pandas as pd

    data_dir = Path("data") / "artifacts"
    if not data_dir.exists():
        print("No data/artifacts dir; skip validation.")
        return 0
    clean_files = list(data_dir.glob("brk_13f_*_clean.csv"))
    if not clean_files:
        print("No clean CSV found; skip validation.")
        return 0
    latest = max(clean_files, key=lambda p: p.stat().st_mtime)
    df = pd.read_csv(latest)
    quarter = latest.stem.replace("brk_13f_", "").replace("_clean", "")
    total = df["value_usd"].sum()
    weight_sum = df["weight_pct"].sum()
    shares = df["sshprnamt"].replace(0, pd.NA)
    valid = shares.notna() & (shares > 0)
    implied = (df.loc[valid, "value_usd"] / df.loc[valid, "sshprnamt"]).median() if valid.any() else 0.0
    status, details = validate_quarter(df, total, weight_sum, float(implied))
    print(f"Quarter {quarter}: {status}")
    print(details)
    return 1 if status == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
