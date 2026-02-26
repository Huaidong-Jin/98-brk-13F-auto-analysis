"""
Write artifacts: raw, clean, agg, meta JSON to output_dir.
Naming: brk_13f_{quarter}_raw.csv, _clean.csv, _agg.csv, _meta.json.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


def write_artifacts(
    quarter: str,
    raw_df: pd.DataFrame,
    clean_df: pd.DataFrame,
    agg_df: pd.DataFrame,
    meta: dict[str, Any],
    output_dir: Path,
) -> dict[str, Path]:
    """Write CSV/JSON files; return {artifact_type: file_path}."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}
    prefix = f"brk_13f_{quarter}"
    if not raw_df.empty:
        p = output_dir / f"{prefix}_raw.csv"
        raw_df.to_csv(p, index=False)
        paths["raw_csv"] = p
    if not clean_df.empty:
        p = output_dir / f"{prefix}_clean.csv"
        clean_df.to_csv(p, index=False)
        paths["clean_csv"] = p
    if not agg_df.empty:
        p = output_dir / f"{prefix}_agg.csv"
        agg_df.to_csv(p, index=False)
        paths["agg_csv"] = p
    meta_path = output_dir / f"{prefix}_meta.json"
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    paths["meta_json"] = meta_path
    return paths
