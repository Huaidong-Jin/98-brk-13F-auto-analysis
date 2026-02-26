"""API v1 routes: summary, quarters, quarter detail, holding detail, meta, artifacts, download, health, ingest."""

from __future__ import annotations

import json
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Any, AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, Request, Security
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.narrative import build_narrative
from app.models import FilingMeta, HoldingAgg, SchedulerState
from app.schemas import (
    ArtifactItem,
    ChangeLeaderboardItem,
    ChangeLeaderboardOut,
    ChangesSummaryItem,
    FilingMetaOut,
    HealthOut,
    HoldingAggItem,
    HoldingDetailOut,
    HoldingTimeSeriesItem,
    IngestTriggerOut,
    QuarterDetailOut,
    QuarterListItem,
    SummaryOut,
    TopHoldingsTimeseriesOut,
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
    # All quarters ascending for trend/peak/trough
    result = await session.execute(select(FilingMeta).order_by(FilingMeta.quarter))
    quarters = result.scalars().all()
    portfolio_trend = [
        {"quarter": m.quarter, "total_value_usd": m.total_value_usd} for m in quarters
    ]
    concentration_trend: list[dict[str, Any]] = []
    for m in quarters:
        r = await session.execute(
            select(HoldingAgg)
            .where(HoldingAgg.quarter == m.quarter)
            .order_by(HoldingAgg.rank)
            .limit(10)
        )
        agg_top = r.scalars().all()
        top1 = agg_top[0].weight_pct if agg_top else 0.0
        top5 = float(sum(a.weight_pct for a in agg_top[:5]))
        top10 = float(sum(a.weight_pct for a in agg_top[:10]))
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

    # Previous and YoY quarters for deltas
    prev_meta = None
    if len(quarters) >= 2:
        prev_meta = quarters[-2]
    yoy_quarter = None
    yoy_meta = None
    try:
        year = int(latest.quarter[:4])
        q = latest.quarter[4:]
        yoy_quarter = f"{year - 1}{q}"
    except Exception:
        yoy_quarter = None
    if yoy_quarter:
        yoy_meta = await session.get(FilingMeta, yoy_quarter)

    # Top holdings for latest quarter
    r_latest_top = await session.execute(
        select(HoldingAgg)
        .where(HoldingAgg.quarter == latest.quarter)
        .order_by(HoldingAgg.rank)
        .limit(10)
    )
    latest_top = r_latest_top.scalars().all()
    top1_row = latest_top[0] if latest_top else None
    top1_name = top1_row.issuer_name if top1_row else None
    top1_weight_pct = top1_row.weight_pct if top1_row else None
    top1_value_usd = top1_row.value_usd if top1_row else None
    top1_delta_pct = (
        float(top1_row.delta_weight_pct) if top1_row and top1_row.delta_weight_pct else None
    )
    top1_delta_usd = (
        float(top1_row.delta_value_usd) if top1_row and top1_row.delta_value_usd else None
    )
    top10_weight_pct_val = float(sum(r.weight_pct for r in latest_top))
    top10_value_usd_val = float(sum(r.value_usd for r in latest_top))

    # YoY delta for Top10 pct
    top10_yoy_delta_pct = None
    if yoy_meta:
        r_yoy_top = await session.execute(
            select(HoldingAgg)
            .where(HoldingAgg.quarter == yoy_meta.quarter)
            .order_by(HoldingAgg.rank)
            .limit(10)
        )
        yoy_top = r_yoy_top.scalars().all()
        yoy_top10_pct = float(sum(r.weight_pct for r in yoy_top))
        top10_yoy_delta_pct = top10_weight_pct_val - yoy_top10_pct

    # Peak and trough of portfolio value
    peak_quarter = None
    peak_value = None
    trough_quarter = None
    trough_value = None
    if quarters:
        peak_meta = max(quarters, key=lambda m: m.total_value_usd)
        trough_meta = min(quarters, key=lambda m: m.total_value_usd)
        peak_quarter = peak_meta.quarter
        peak_value = peak_meta.total_value_usd
        trough_quarter = trough_meta.quarter
        trough_value = trough_meta.total_value_usd

    # Directions (categorical for i18n)
    def _direction_from_delta(pct: float | None) -> str | None:
        if pct is None:
            return None
        if pct >= 15:
            return "up_strong"
        if pct >= 5:
            return "up_mild"
        if pct <= -15:
            return "down_strong"
        if pct <= -5:
            return "down_mild"
        return "flat"

    qoq_delta_usd = None
    qoq_delta_pct = None
    if prev_meta and latest.total_value_usd is not None:
        qoq_delta_usd = float(latest.total_value_usd - prev_meta.total_value_usd)
        base = float(prev_meta.total_value_usd) or 1.0
        qoq_delta_pct = (qoq_delta_usd / base) * 100.0
    qoq_direction = _direction_from_delta(qoq_delta_pct)

    conc_direction = None
    if top10_yoy_delta_pct is not None:
        conc_direction = _direction_from_delta(top10_yoy_delta_pct)

    top1_direction = _direction_from_delta(top1_delta_pct)

    narrative = build_narrative(latest, session)
    # Fetch last ingest timestamp from SchedulerState for staleness detection
    state_row = await session.get(SchedulerState, "ingest")
    last_updated = (
        state_row.last_run_at.isoformat() if state_row and state_row.last_run_at else None
    )
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
        last_updated=last_updated,
        qoq_delta_usd=qoq_delta_usd,
        qoq_delta_pct=qoq_delta_pct,
        top1_name=top1_name,
        top1_weight_pct=top1_weight_pct,
        top1_value_usd=top1_value_usd,
        top1_delta_pct=top1_delta_pct,
        top1_delta_usd=top1_delta_usd,
        top10_weight_pct=top10_weight_pct_val,
        top10_value_usd=top10_value_usd_val,
        top10_yoy_delta_pct=top10_yoy_delta_pct,
        peak_quarter=peak_quarter,
        peak_value_usd=peak_value,
        trough_quarter=trough_quarter,
        trough_value_usd=trough_value,
        qoq_direction=qoq_direction,
        conc_direction=conc_direction,
        top1_direction=top1_direction,
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


@router.get(
    "/quarters/{quarter}/changes_leaderboard", response_model=ChangeLeaderboardOut
)
async def get_changes_leaderboard(
    quarter: str,
    sort_metric: str = "value_usd",
    session: AsyncSession = Depends(get_session),
) -> ChangeLeaderboardOut:
    """Largest buys/sells and NEW/EXIT counts for a quarter."""
    if not re.match(r"^\d{4}Q[1-4]$", quarter):
        raise HTTPException(
            status_code=400, detail="Invalid quarter format (use yyyyQq)"
        )
    if sort_metric not in {"value_usd", "weight_pct"}:
        raise HTTPException(
            status_code=400,
            detail="Invalid sort_metric (use 'value_usd' or 'weight_pct')",
        )
    meta = await session.get(FilingMeta, quarter)
    if not meta:
        raise HTTPException(status_code=404, detail="Quarter not found")
    r = await session.execute(
        select(HoldingAgg)
        .where(HoldingAgg.quarter == quarter)
        .order_by(HoldingAgg.rank)
    )
    rows = r.scalars().all()
    if not rows:
        return ChangeLeaderboardOut(
            quarter=quarter,
            compare_quarter=None,
            sort_metric=sort_metric,
            largest_buy_name=None,
            largest_sell_name=None,
            new_count=0,
            exit_count=0,
            buys=[],
            sells=[],
        )
    # Determine comparison quarter from prev_quarter on any row (they should match)
    compare_quarter = next((row.prev_quarter for row in rows if row.prev_quarter), None)

    new_rows = [row for row in rows if row.change_type == "NEW"]
    exit_rows = [row for row in rows if row.change_type == "CLOSED"]
    buy_rows = [row for row in rows if row.change_type == "INCREASED"]
    sell_rows = [row for row in rows if row.change_type == "DECREASED"]

    def _item_from_row(row: HoldingAgg, label: str) -> ChangeLeaderboardItem:
        delta_pct = float(row.delta_weight_pct or 0.0)
        delta_usd = float(row.delta_value_usd or 0.0)
        return ChangeLeaderboardItem(
            issuer_name=row.issuer_name,
            cusip=row.cusip,
            ticker=row.ticker,
            weight_pct=row.weight_pct,
            value_usd=row.value_usd,
            delta_pct=delta_pct,
            delta_usd=delta_usd,
            label=label,
        )

    # Sort buys by descending delta_usd, sells by ascending (most negative first)
    def _metric_value(row: HoldingAgg) -> float:
        if sort_metric == "weight_pct":
            return float(row.delta_weight_pct or 0.0)
        return float(row.delta_value_usd or 0.0)

    buys_sorted = sorted(
        buy_rows,
        key=lambda r: abs(_metric_value(r)),
        reverse=True,
    )
    sells_sorted = sorted(
        sell_rows,
        key=lambda r: abs(_metric_value(r)),
    )
    top_buys = [_item_from_row(r, "BUY") for r in buys_sorted[:10]]
    top_sells = [_item_from_row(r, "SELL") for r in sells_sorted[:10]]

    largest_buy_name = top_buys[0].issuer_name if top_buys else None
    largest_sell_name = top_sells[0].issuer_name if top_sells else None

    return ChangeLeaderboardOut(
        quarter=quarter,
        compare_quarter=compare_quarter,
        sort_metric=sort_metric,
        largest_buy_name=largest_buy_name,
        largest_sell_name=largest_sell_name,
        new_count=len(new_rows),
        exit_count=len(exit_rows),
        buys=top_buys,
        sells=top_sells,
    )


@router.get("/summary/top_holdings_timeseries", response_model=TopHoldingsTimeseriesOut)
async def get_top_holdings_timeseries(
    top: int = 5,
    quarters_limit: int = 20,
    session: AsyncSession = Depends(get_session),
) -> TopHoldingsTimeseriesOut:
    """Top N holdings' weight_pct per quarter for composition chart."""
    q_result = await session.execute(
        select(FilingMeta.quarter).order_by(FilingMeta.quarter.desc()).limit(quarters_limit)
    )
    quarters = [r[0] for r in q_result.all()]
    if not quarters:
        return TopHoldingsTimeseriesOut(quarters=[], series=[])
    quarters.reverse()
    latest = quarters[-1]
    r_top = await session.execute(
        select(HoldingAgg.cusip, HoldingAgg.issuer_name)
        .where(HoldingAgg.quarter == latest)
        .order_by(HoldingAgg.rank)
        .limit(top)
    )
    top_rows = r_top.all()
    if not top_rows:
        return TopHoldingsTimeseriesOut(quarters=quarters, series=[])
    cusips = [r[0] for r in top_rows]
    names = [r[1] for r in top_rows]
    series_list: list[dict[str, object]] = []
    for i, cusip in enumerate(cusips):
        r_agg = await session.execute(
            select(HoldingAgg.quarter, HoldingAgg.weight_pct)
            .where(HoldingAgg.cusip == cusip)
            .where(HoldingAgg.quarter.in_(quarters))
            .order_by(HoldingAgg.quarter)
        )
        by_q = {r[0]: r[1] for r in r_agg.all()}
        weights = [by_q.get(q, 0.0) for q in quarters]
        series_list.append({"issuer_name": names[i], "cusip": cusip, "weights": weights})
    return TopHoldingsTimeseriesOut(quarters=quarters, series=series_list)


@router.get("/quarters/changes_summary", response_model=list[ChangesSummaryItem])
async def get_changes_summary(
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
) -> list[ChangesSummaryItem]:
    """Per-quarter counts of new/increased/decreased/closed holdings (for home chart)."""
    quarters_result = await session.execute(
        select(FilingMeta.quarter).order_by(FilingMeta.quarter.desc()).limit(limit)
    )
    quarters = [r[0] for r in quarters_result.all()]
    if not quarters:
        return []
    quarters.reverse()
    counts: dict[str, dict[str, int]] = {
        q: {"new_count": 0, "increased_count": 0, "decreased_count": 0, "closed_count": 0}
        for q in quarters
    }
    for quarter in quarters:
        r = await session.execute(
            select(HoldingAgg.change_type, func.count(HoldingAgg.cusip))
            .where(HoldingAgg.quarter == quarter)
            .group_by(HoldingAgg.change_type)
        )
        for change_type, cnt in r.all():
            if change_type == "NEW":
                counts[quarter]["new_count"] = cnt
            elif change_type == "INCREASED":
                counts[quarter]["increased_count"] = cnt
            elif change_type == "DECREASED":
                counts[quarter]["decreased_count"] = cnt
            elif change_type == "CLOSED":
                counts[quarter]["closed_count"] = cnt
    return [
        ChangesSummaryItem(quarter=q, **counts[q])
        for q in quarters
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


@router.get("/quarters/{quarter}/holdings_full", response_model=list[HoldingAggItem])
async def get_quarter_holdings_full(
    quarter: str,
    session: AsyncSession = Depends(get_session),
) -> list[HoldingAggItem]:
    """Full holdings list for a quarter (for exploration table)."""
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
    )
    rows = r.scalars().all()
    return [_agg_to_item(row) for row in rows]


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
    """Health check: DB status and last ingest run metadata."""
    from sqlalchemy import text

    db_ok = False
    try:
        await session.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    state = await session.get(SchedulerState, "ingest")
    last_ingest_at = (
        state.last_run_at.isoformat() if state and state.last_run_at else None
    )
    last_ingest_status = state.last_status if state else None
    return HealthOut(
        status="ok" if db_ok else "degraded",
        db_ok=db_ok,
        drive_ok=None,
        last_ingest_at=last_ingest_at,
        last_ingest_status=last_ingest_status,
    )


_bearer = HTTPBearer(auto_error=False)


def _verify_ingest_token(
    credentials: HTTPAuthorizationCredentials | None = Security(_bearer),
) -> None:
    """Validate bearer token for the ingest trigger endpoint.

    If INGEST_API_KEY env var is not set, the endpoint is open (dev/local use).
    """
    import os

    api_key = os.environ.get("INGEST_API_KEY")
    if not api_key:
        return  # No key configured → open (dev mode)
    if not credentials or credentials.credentials != api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@router.post("/ingest/trigger", response_model=IngestTriggerOut)
async def trigger_ingest(
    force: bool = False,
    recent_only: bool = True,
    _: None = Depends(_verify_ingest_token),
) -> IngestTriggerOut:
    """Manually trigger the ingest pipeline.

    - recent_only=true (default): only fetch filings from the last 6 months
    - force=true: re-process quarters already in the database
    - Requires Bearer token matching INGEST_API_KEY env var (if set)
    """
    from app.ingestion.run import run_ingest

    since = date.today() - timedelta(days=180) if recent_only else None
    result = await run_ingest(since_date=since, force=force)
    return IngestTriggerOut(
        new_filings=result.get("new_filings", 0),
        success=result.get("success", []),
        skipped=result.get("skipped", []),
        failed=result.get("failed", []),
        duration_s=result.get("duration_s", 0.0),
    )
