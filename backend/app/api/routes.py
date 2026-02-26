"""API v1 routes: summary, quarters, quarter detail, holding detail, meta, artifacts, download, health."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.narrative import build_narrative
from app.models import FilingMeta, HoldingAgg
from app.schemas import (
    ArtifactItem,
    FilingMetaOut,
    HealthOut,
    HoldingAggItem,
    HoldingDetailOut,
    HoldingTimeSeriesItem,
    QuarterDetailOut,
    QuarterListItem,
    SummaryOut,
)


async def get_session(request: Request) -> AsyncGenerator[AsyncSession, None]:
    """Dependency: yield async session from app.state.session_maker."""
    session_maker = getattr(request.app.state, "session_maker", None)
    if not session_maker:
        raise RuntimeError("session_maker not set on app.state")
    async with session_maker() as session:
        yield session

router = APIRouter(prefix="/api/v1", tags=["api"])


def _meta_to_out(m: FilingMeta) -> FilingMetaOut:
    return FilingMetaOut(
        quarter=m.quarter,
        used_accessions=json.loads(m.used_accessions) if m.used_accessions else [],
        amendment_types=json.loads(m.amendment_types) if m.amendment_types else [],
        unit_multiplier=m.unit_multiplier,
        unit_reason=m.unit_reason,
        total_value_usd=m.total_value_usd,
        weight_sum_pct=m.weight_sum_pct,
        implied_price_median=m.implied_price_median,
        num_holdings=m.num_holdings,
        validation_status=m.validation_status,
        validation_details=(
            json.loads(m.validation_details) if m.validation_details else {}
        ),
        drive_urls=json.loads(m.drive_urls) if m.drive_urls else {},
        sec_filing_urls=json.loads(m.sec_filing_urls) if m.sec_filing_urls else [],
        created_at=m.created_at.isoformat() if m.created_at else None,
        updated_at=m.updated_at.isoformat() if m.updated_at else None,
    )


def _agg_to_item(row: HoldingAgg) -> HoldingAggItem:
    return HoldingAggItem(
        quarter=row.quarter,
        cusip=row.cusip,
        issuer_name=row.issuer_name,
        ticker=row.ticker,
        value_usd=row.value_usd,
        shares=row.shares,
        weight_pct=row.weight_pct,
        rank=row.rank,
        prev_quarter=row.prev_quarter,
        prev_value_usd=row.prev_value_usd,
        prev_weight_pct=row.prev_weight_pct,
        delta_value_usd=row.delta_value_usd,
        delta_weight_pct=row.delta_weight_pct,
        change_type=row.change_type,
    )


@router.get("/summary", response_model=SummaryOut)
async def get_summary(session: AsyncSession = Depends(get_session)) -> SummaryOut:
    """Summary for home: latest quarter, trend, concentration, narrative."""
    result = await session.execute(
        select(FilingMeta).order_by(FilingMeta.quarter.desc()).limit(1)
    )
    latest = result.scalars().first()
    if not latest:
        return SummaryOut(
            latest_quarter=None,
            total_value_usd=None,
            num_holdings=None,
            top1_pct=None,
            top5_pct=None,
            top10_pct=None,
            portfolio_trend=[],
            concentration_trend=[],
            narrative=None,
        )
    result = await session.execute(select(FilingMeta).order_by(FilingMeta.quarter))
    quarters = result.scalars().all()
    portfolio_trend = [
        {"quarter": m.quarter, "total_value_usd": m.total_value_usd} for m in quarters
    ]
    concentration_trend = []
    for m in quarters:
        r = await session.execute(
            select(HoldingAgg)
            .where(HoldingAgg.quarter == m.quarter)
            .order_by(HoldingAgg.rank)
            .limit(10)
        )
        agg_top = r.scalars().all()
        top1 = agg_top[0].weight_pct if agg_top else 0
        top5 = sum(a.weight_pct for a in agg_top[:5])
        top10 = sum(a.weight_pct for a in agg_top[:10])
        concentration_trend.append(
            {
                "quarter": m.quarter,
                "top1_pct": top1,
                "top5_pct": top5,
                "top10_pct": top10,
            }
        )
    top1_pct = concentration_trend[-1]["top1_pct"] if concentration_trend else None
    top5_pct = concentration_trend[-1]["top5_pct"] if concentration_trend else None
    top10_pct = concentration_trend[-1]["top10_pct"] if concentration_trend else None
    narrative = build_narrative(latest, session)
    return SummaryOut(
        latest_quarter=latest.quarter,
        total_value_usd=latest.total_value_usd,
        num_holdings=latest.num_holdings,
        top1_pct=top1_pct,
        top5_pct=top5_pct,
        top10_pct=top10_pct,
        portfolio_trend=portfolio_trend,
        concentration_trend=concentration_trend,
        narrative=narrative,
    )


@router.get("/quarters", response_model=list[QuarterListItem])
async def list_quarters(
    session: AsyncSession = Depends(get_session),
) -> list[QuarterListItem]:
    """List all quarters with total_value_usd, num_holdings, validation_status."""
    result = await session.execute(
        select(FilingMeta).order_by(FilingMeta.quarter.desc())
    )
    rows = result.scalars().all()
    return [
        QuarterListItem(
            quarter=m.quarter,
            total_value_usd=m.total_value_usd,
            num_holdings=m.num_holdings,
            validation_status=m.validation_status,
        )
        for m in rows
    ]


@router.get("/quarters/{quarter}", response_model=QuarterDetailOut)
async def get_quarter_detail(
    quarter: str, session: AsyncSession = Depends(get_session)
) -> QuarterDetailOut:
    """Quarter detail: meta, top 20 holdings, changes (new/increased/decreased/closed)."""
    if not re.match(r"^\d{4}Q[1-4]$", quarter):
        raise HTTPException(
            status_code=400, detail="Invalid quarter format (use yyyyQq)"
        )
    meta = await session.get(FilingMeta, quarter)
    if not meta:
        raise HTTPException(status_code=404, detail="Quarter not found")
    r = await session.execute(
        select(HoldingAgg)
        .where(HoldingAgg.quarter == quarter)
        .order_by(HoldingAgg.rank)
        .limit(20)
    )
    top = r.scalars().all()
    r2 = await session.execute(select(HoldingAgg).where(HoldingAgg.quarter == quarter))
    all_agg = r2.scalars().all()
    changes = {"new": [], "increased": [], "decreased": [], "closed": []}
    for row in all_agg:
        item = _agg_to_item(row)
        if row.change_type == "NEW":
            changes["new"].append(item)
        elif row.change_type == "INCREASED":
            changes["increased"].append(item)
        elif row.change_type == "DECREASED":
            changes["decreased"].append(item)
        elif row.change_type == "CLOSED":
            changes["closed"].append(item)
    return QuarterDetailOut(
        meta=_meta_to_out(meta),
        top_holdings=[_agg_to_item(r) for r in top],
        changes=changes,
    )


@router.get("/holdings/{cusip_or_ticker}", response_model=HoldingDetailOut)
async def get_holding_detail(
    cusip_or_ticker: str, session: AsyncSession = Depends(get_session)
) -> HoldingDetailOut:
    """Time series for one holding by CUSIP or ticker."""
    r = await session.execute(
        select(HoldingAgg)
        .where(HoldingAgg.cusip == cusip_or_ticker)
        .order_by(HoldingAgg.quarter)
    )
    agg_by_cusip = r.scalars().all()
    r2 = await session.execute(
        select(HoldingAgg)
        .where(HoldingAgg.ticker == cusip_or_ticker)
        .order_by(HoldingAgg.quarter)
    )
    agg_by_ticker = r2.scalars().all()
    agg_list = agg_by_cusip or agg_by_ticker
    if not agg_list:
        raise HTTPException(status_code=404, detail="Holding not found")
    row0 = agg_list[0]
    ts = [
        HoldingTimeSeriesItem(
            quarter=r.quarter,
            value_usd=r.value_usd,
            weight_pct=r.weight_pct,
            shares=r.shares,
            rank=r.rank,
        )
        for r in agg_list
    ]
    return HoldingDetailOut(
        issuer_name=row0.issuer_name,
        ticker=row0.ticker,
        cusip=row0.cusip,
        time_series=ts,
    )


@router.get("/meta/{quarter}", response_model=FilingMetaOut)
async def get_meta(
    quarter: str, session: AsyncSession = Depends(get_session)
) -> FilingMetaOut:
    """Filing meta for a quarter."""
    meta = await session.get(FilingMeta, quarter)
    if not meta:
        raise HTTPException(status_code=404, detail="Quarter not found")
    return _meta_to_out(meta)


@router.get("/artifacts", response_model=list[ArtifactItem])
async def list_artifacts(
    session: AsyncSession = Depends(get_session),
) -> list[ArtifactItem]:
    """List downloadable artifacts (from meta; download_url from drive_urls or local)."""
    result = await session.execute(
        select(FilingMeta).order_by(FilingMeta.quarter.desc())
    )
    metas = result.scalars().all()
    out = []
    for m in metas:
        drive_urls = json.loads(m.drive_urls) if m.drive_urls else {}
        for art_type in ["raw_csv", "clean_csv", "agg_csv", "meta_json"]:
            out.append(
                ArtifactItem(
                    artifact_type=art_type,
                    quarter=m.quarter,
                    generated_at=m.updated_at.isoformat() if m.updated_at else None,
                    validation_status=m.validation_status,
                    download_url=drive_urls.get(art_type)
                    or f"/api/v1/download/{art_type}?quarter={m.quarter}",
                )
            )
    return out


@router.get("/download/{artifact_type}")
async def download_artifact(
    artifact_type: str,
    quarter: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    """Redirect to Drive URL or serve local file."""
    if artifact_type not in ("raw_csv", "clean_csv", "agg_csv", "meta_json", "all_zip"):
        raise HTTPException(status_code=400, detail="Invalid artifact_type")
    if not quarter:
        raise HTTPException(status_code=400, detail="quarter required")
    meta = await session.get(FilingMeta, quarter)
    if meta and meta.drive_urls:
        urls = json.loads(meta.drive_urls)
        url = urls.get(artifact_type)
        if url:
            return RedirectResponse(url=url, status_code=302)
    data_dir = Path("data/artifacts")
    if artifact_type == "meta_json":
        f = data_dir / f"brk_13f_{quarter}_meta.json"
    else:
        f = data_dir / f"brk_13f_{quarter}_{artifact_type}.csv"
    if f.exists():
        return FileResponse(f, filename=f.name)
    raise HTTPException(status_code=404, detail="Artifact not found")


@router.get("/health", response_model=HealthOut)
async def health(session: AsyncSession = Depends(get_session)) -> HealthOut:
    """Health check."""
    from sqlalchemy import text

    db_ok = False
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return HealthOut(
        status="ok" if db_ok else "degraded",
        db_ok=db_ok,
        drive_ok=None,
        last_ingest_at=None,
        last_ingest_status=None,
    )
