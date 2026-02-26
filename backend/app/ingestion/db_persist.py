"""
Persist clean_df, agg_df, meta to DB (optional step after write_artifacts).
Uses DATABASE_URL from env; creates its own engine/session.
"""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import FilingMeta, HoldingAgg, HoldingClean

# Lazy engine/session per process
_engine = None
_session_maker = None


def _get_engine():
    import os

    global _engine
    if _engine is None:
        url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./data/brk13f.db")
        _engine = create_async_engine(url, echo=False)
    return _engine


def _get_session_maker():
    global _session_maker
    if _session_maker is None:
        from sqlalchemy.ext.asyncio import async_sessionmaker

        _session_maker = async_sessionmaker(
            _get_engine(), class_=AsyncSession, expire_on_commit=False, autoflush=False
        )
    return _session_maker


async def persist_quarter_to_db(
    quarter: str,
    clean_df: pd.DataFrame,
    agg_df: pd.DataFrame,
    meta: dict[str, Any],
) -> None:
    """Upsert one quarter's clean, agg, and meta to DB."""
    if clean_df.empty and agg_df.empty:
        return
    sm = _get_session_maker()
    async with sm() as session:
        # FilingMeta
        meta_row = FilingMeta(
            quarter=quarter,
            used_accessions=json.dumps(meta.get("used_accessions", [])),
            amendment_types=json.dumps(meta.get("amendment_types", [])),
            unit_multiplier=meta.get("unit_multiplier", 1000),
            unit_reason=meta.get("unit_reason", ""),
            total_value_usd=meta.get("total_value_usd", 0),
            weight_sum_pct=meta.get("weight_sum_pct", 0),
            implied_price_median=meta.get("implied_price_median", 0),
            num_holdings=meta.get("num_holdings", 0),
            validation_status=meta.get("validation_status", "PASS"),
            validation_details=json.dumps(meta.get("validation_details", {})),
            drive_urls=json.dumps(meta.get("drive_urls", {})),
            sec_filing_urls=json.dumps(meta.get("sec_filing_urls", [])),
            updated_at=datetime.utcnow(),
        )
        await session.merge(meta_row)
        # HoldingClean: delete existing for quarter then insert
        from sqlalchemy import delete

        await session.execute(
            delete(HoldingClean).where(HoldingClean.quarter == quarter)
        )
        for _, row in clean_df.iterrows():
            putcall = row.get("putcall")
            if pd.isna(putcall):
                putcall = None
            else:
                putcall = str(putcall)
            session.add(
                HoldingClean(
                    quarter=str(quarter),
                    cusip=str(row["cusip"]),
                    putcall=putcall,
                    issuer_name=str(row.get("issuer_name", ""))[:512],
                    value_raw=int(row.get("value_raw", 0)),
                    sshprnamt=int(row.get("sshprnamt", 0)),
                    unit_multiplier=int(row.get("unit_multiplier", 1000)),
                    unit_reason=str(row.get("unit_reason", ""))[:256],
                    value_usd=float(row.get("value_usd", 0)),
                    total_value_usd_q=float(row.get("total_value_usd_q", 0)),
                    weight_pct=float(row.get("weight_pct", 0)),
                    ticker=(
                        str(row["ticker"])
                        if pd.notna(row.get("ticker")) and row.get("ticker")
                        else None
                    ),
                )
            )
        await session.execute(delete(HoldingAgg).where(HoldingAgg.quarter == quarter))
        for _, row in agg_df.iterrows():
            session.add(
                HoldingAgg(
                    quarter=str(row["quarter"]),
                    cusip=str(row["cusip"]),
                    issuer_name=str(row.get("issuer_name", ""))[:512],
                    ticker=(
                        str(row["ticker"])
                        if pd.notna(row.get("ticker")) and row.get("ticker")
                        else None
                    ),
                    value_usd=float(row.get("value_usd", 0)),
                    shares=int(row.get("shares", 0)),
                    weight_pct=float(row.get("weight_pct", 0)),
                    rank=int(row.get("rank", 0)),
                    prev_quarter=(
                        str(row["prev_quarter"])
                        if pd.notna(row.get("prev_quarter"))
                        else None
                    ),
                    prev_value_usd=(
                        float(row["prev_value_usd"])
                        if pd.notna(row.get("prev_value_usd"))
                        else None
                    ),
                    prev_weight_pct=(
                        float(row["prev_weight_pct"])
                        if pd.notna(row.get("prev_weight_pct"))
                        else None
                    ),
                    delta_value_usd=(
                        float(row["delta_value_usd"])
                        if pd.notna(row.get("delta_value_usd"))
                        else None
                    ),
                    delta_weight_pct=(
                        float(row["delta_weight_pct"])
                        if pd.notna(row.get("delta_weight_pct"))
                        else None
                    ),
                    change_type=(
                        str(row["change_type"])
                        if pd.notna(row.get("change_type"))
                        else None
                    ),
                )
            )
        await session.commit()
