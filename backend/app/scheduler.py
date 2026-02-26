"""
APScheduler: register daily ingest job.
Call run_ingest from app.ingestion.run and optionally persist to DB.
"""

from __future__ import annotations

from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.ingestion.run import run_ingest


def register_scheduler(scheduler: AsyncIOScheduler) -> None:
    """Register daily 00:00 UTC ingest job."""
    scheduler.add_job(
        _scheduled_ingest,
        CronTrigger(hour=0, minute=0),
        id="brk13f_ingest",
        replace_existing=True,
    )


async def _scheduled_ingest() -> None:
    """Wrapper that runs full ingest (output_dir and drive from env)."""
    await run_ingest(
        output_dir=Path("data/artifacts"),
        drive_folder_id=None,
        since_date=None,
    )
