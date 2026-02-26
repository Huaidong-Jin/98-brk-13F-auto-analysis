"""
APScheduler: register ingest jobs with filing-window-aware scheduling.

13F filings are due 45 days after each quarter end:
  Q1 (Mar 31) → due ~May 15   → filing window: May 1-31
  Q2 (Jun 30) → due ~Aug 14   → filing window: Aug 1-31
  Q3 (Sep 30) → due ~Nov 14   → filing window: Nov 1-30
  Q4 (Dec 31) → due ~Feb 14   → filing window: Feb 1-28

During filing windows: poll daily at 06:00 UTC (after SEC batch publishing).
Outside filing windows: poll every Monday at 06:00 UTC (safety net for amendments).
"""

from __future__ import annotations

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = structlog.get_logger()

# Months where SEC 13F filings are expected (filing window months)
FILING_WINDOW_MONTHS = {2, 5, 8, 11}


def _is_filing_window() -> bool:
    """Return True if today falls within a quarterly 13F filing window."""
    from datetime import date

    return date.today().month in FILING_WINDOW_MONTHS


def register_scheduler(scheduler: AsyncIOScheduler) -> None:
    """Register two complementary ingest jobs.

    1. Daily at 06:00 UTC — runs only during filing-window months (Feb/May/Aug/Nov).
       Catches new 13F submissions quickly (within 24h of SEC publication).
    2. Every Monday at 06:00 UTC — runs year-round as a safety net for
       late filings and amendments outside main windows.
    """
    # Daily poll during filing windows
    scheduler.add_job(
        _filing_window_ingest,
        CronTrigger(hour=6, minute=0),
        id="brk13f_ingest_daily",
        replace_existing=True,
    )
    # Weekly safety-net for amended filings outside main windows
    scheduler.add_job(
        _weekly_ingest,
        CronTrigger(day_of_week="mon", hour=6, minute=0),
        id="brk13f_ingest_weekly",
        replace_existing=True,
    )
    logger.info(
        "scheduler_registered",
        daily_job="brk13f_ingest_daily",
        weekly_job="brk13f_ingest_weekly",
    )


async def _filing_window_ingest() -> None:
    """Run ingest only during quarterly filing window months."""
    if not _is_filing_window():
        logger.debug("ingest_skipped_outside_filing_window")
        return
    logger.info("ingest_triggered", trigger="daily_filing_window")
    await _run_recent_ingest()


async def _weekly_ingest() -> None:
    """Run ingest weekly as a safety net; skips filing-window months to avoid double-run."""
    if _is_filing_window():
        logger.debug("weekly_ingest_skipped_filing_window_already_covered")
        return
    logger.info("ingest_triggered", trigger="weekly_safety_net")
    await _run_recent_ingest()


async def _run_recent_ingest() -> None:
    """Run ingest for the last 6 months (recent-only) with idempotency."""
    from datetime import date, timedelta
    from pathlib import Path

    from app.ingestion.run import run_ingest

    since = date.today() - timedelta(days=180)
    result = await run_ingest(
        output_dir=Path("data/artifacts"),
        drive_folder_id=None,
        since_date=since,
        force=False,
    )
    logger.info(
        "scheduled_ingest_complete",
        new=result.get("new_filings"),
        success=result.get("success"),
        skipped=result.get("skipped"),
        failed=result.get("failed"),
        duration_s=result.get("duration_s"),
    )
