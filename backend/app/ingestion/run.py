"""
Orchestrate full ingest: fetch filings, group by period, merge/detect/normalize/validate/write/drive.
Uses structlog for structured logs; alerts on FAIL.
"""

from __future__ import annotations

import asyncio
import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd
import structlog

from app.ingestion.agg_builder import build_agg_for_quarter
from app.ingestion.alerts import send_alert, send_success_alert
from app.ingestion.fetcher import fetch_filings, download_infotable
from app.ingestion.merger import merge_amendments
from app.ingestion.normalizer import normalize_and_recompute_weights
from app.ingestion.parser import parse_infotable
from app.ingestion.unit_detector import detect_unit_multiplier_per_quarter
from app.ingestion.validator import validate_quarter
from app.ingestion.writer import write_artifacts

logger = structlog.get_logger()
BRK_CIK = "0001067983"


def _quarter_from_report_date(d: date) -> str:
    """e.g. 2024-09-30 -> 2024Q3."""
    m = d.month
    q = (m - 1) // 3 + 1
    return f"{d.year}Q{q}"


def _prev_quarter_str(quarter: str) -> str | None:
    """Return the quarter immediately before the given one, e.g. 2024Q1 -> 2023Q4."""
    try:
        year, q = int(quarter[:4]), int(quarter[5])
    except (ValueError, IndexError):
        return None
    if q == 1:
        return f"{year - 1}Q4"
    return f"{year}Q{q - 1}"


async def _check_quarter_exists(quarter: str) -> bool:
    """Return True if this quarter has already been ingested with PASS or WARN status."""
    from sqlalchemy import select

    from app.ingestion.db_persist import _get_session_maker
    from app.models import FilingMeta

    try:
        sm = _get_session_maker()
        async with sm() as session:
            meta = await session.get(FilingMeta, quarter)
            if meta and meta.validation_status in ("PASS", "WARN"):
                return True
    except Exception as e:
        logger.warning("check_quarter_exists_failed", quarter=quarter, error=str(e))
    return False


async def _load_prev_quarter_agg(quarter: str) -> pd.DataFrame | None:
    """Load the previous quarter's HoldingAgg rows as a DataFrame for delta computation."""
    from sqlalchemy import select

    from app.ingestion.db_persist import _get_session_maker
    from app.models import HoldingAgg

    prev_q = _prev_quarter_str(quarter)
    if not prev_q:
        return None
    try:
        sm = _get_session_maker()
        async with sm() as session:
            r = await session.execute(
                select(HoldingAgg).where(HoldingAgg.quarter == prev_q)
            )
            rows = r.scalars().all()
        if not rows:
            return None
        return pd.DataFrame(
            [
                {
                    "quarter": row.quarter,
                    "cusip": row.cusip,
                    "issuer_name": row.issuer_name,
                    "ticker": row.ticker,
                    "value_usd": row.value_usd,
                    "shares": row.shares,
                    "weight_pct": row.weight_pct,
                    "rank": row.rank,
                }
                for row in rows
            ]
        )
    except Exception as e:
        logger.warning("load_prev_agg_failed", quarter=quarter, error=str(e))
        return None


async def _update_scheduler_state(status: str) -> None:
    """Persist last ingest run metadata to SchedulerState table."""
    from app.ingestion.db_persist import _get_session_maker
    from app.models import SchedulerState

    try:
        sm = _get_session_maker()
        async with sm() as session:
            state = SchedulerState(
                id="ingest",
                last_processed_date=date.today(),
                last_run_at=datetime.utcnow(),
                last_status=status,
                updated_at=datetime.utcnow(),
            )
            await session.merge(state)
            await session.commit()
    except Exception as e:
        logger.warning("update_scheduler_state_failed", error=str(e))


async def run_ingest(
    output_dir: Path | None = None,
    drive_folder_id: str | None = None,
    since_date: date | None = None,
    force: bool = False,
) -> dict[str, Any]:
    """
    Full pipeline: fetch 13F filings for BRK, group by period_of_report,
    merge amendments, detect unit, normalize, validate, write artifacts, optional Drive upload.

    Args:
        output_dir: Directory for artifact files.
        drive_folder_id: Google Drive folder for uploads (optional).
        since_date: Only fetch filings on or after this date.
        force: If True, re-process quarters that are already in the DB.

    Returns:
        Summary dict: new_filings, success, skipped, failed, duration_s.
    """
    from app.drive import save_to_google_drive

    output_dir = output_dir or Path("data/artifacts")
    output_dir.mkdir(parents=True, exist_ok=True)
    start = datetime.utcnow()
    summary: dict[str, Any] = {
        "new_filings": 0,
        "success": [],
        "skipped": [],
        "failed": [],
        "duration_s": 0,
    }
    overall_status = "success"
    try:
        filings = await fetch_filings(BRK_CIK, since_date=since_date)
        summary["new_filings"] = len(filings)
        logger.info("fetched_filings", count=len(filings), cik=BRK_CIK)
        if not filings:
            summary["duration_s"] = (datetime.utcnow() - start).total_seconds()
            await _update_scheduler_state("success_no_new_filings")
            return summary
        # Group by reportDate (period_of_report)
        by_period: dict[str, list[dict]] = {}
        for f in filings:
            rd = f.get("reportDate") or ""
            if not rd:
                continue
            try:
                d = date.fromisoformat(rd)
                q = _quarter_from_report_date(d)
                by_period.setdefault(q, []).append(f)
            except ValueError:
                continue
        for quarter, period_filings in by_period.items():
            # Idempotency: skip quarters already ingested (unless force=True)
            if not force and await _check_quarter_exists(quarter):
                logger.info("quarter_skipped_already_ingested", quarter=quarter)
                summary["skipped"].append(quarter)
                continue

            # Sort by filingDate; base = latest 13F-HR, then 13F-HR/A in order
            period_filings.sort(
                key=lambda x: (x.get("form") or "") != "13F-HR", reverse=False
            )
            period_filings.sort(key=lambda x: x.get("filingDate") or "", reverse=True)
            base_candidates = [
                x for x in period_filings if (x.get("form") or "") == "13F-HR"
            ]
            amendments_list = [
                x for x in period_filings if (x.get("form") or "") == "13F-HR/A"
            ]
            if not base_candidates:
                continue
            base_filing = base_candidates[0]
            base_acc = (base_filing.get("accessionNumber") or "").replace("-", "")
            report_date_str = base_filing.get("reportDate") or ""
            try:
                period_date = date.fromisoformat(report_date_str)
            except ValueError:
                period_date = date.today()
            # Download base
            try:
                xml_bytes = await download_infotable(
                    BRK_CIK, base_filing.get("accessionNumber") or base_acc
                )
            except Exception as e:
                logger.exception(
                    "download_base_failed", quarter=quarter, accession=base_acc
                )
                summary["failed"].append({"quarter": quarter, "error": str(e)})
                send_alert(
                    "13F Ingest: download failed",
                    f"Quarter {quarter} base {base_acc}: {e}",
                )
                overall_status = "partial_failure"
                continue
            base_df = parse_infotable(
                xml_bytes,
                base_acc,
                period_date,
                form_type="13F-HR",
                amendment_type=None,
            )
            amend_tuples: list[tuple[str, str, pd.DataFrame]] = []
            for a in amendments_list:
                acc = (a.get("accessionNumber") or "").replace("-", "")
                try:
                    axml = await download_infotable(
                        BRK_CIK, a.get("accessionNumber") or acc
                    )
                except Exception:
                    continue
                a_df = parse_infotable(
                    axml, acc, period_date, form_type="13F-HR/A", amendment_type=None
                )
                amend_type = None
                amend_tuples.append((acc, amend_type or "", a_df))
            merged, merge_meta = merge_amendments(base_df, base_acc, amend_tuples)
            if merged.empty:
                continue
            mult, reason = detect_unit_multiplier_per_quarter(merged)
            clean_df = normalize_and_recompute_weights(merged, mult, reason)
            total_usd = clean_df["value_usd"].sum()
            weight_sum = clean_df["weight_pct"].sum()
            shares = clean_df["sshprnamt"].replace(0, pd.NA)
            valid = shares.notna() & (shares > 0)
            implied = (
                (
                    clean_df.loc[valid, "value_usd"] / clean_df.loc[valid, "sshprnamt"]
                ).median()
                if valid.any()
                else 0.0
            )
            validation_status, validation_details = validate_quarter(
                clean_df,
                total_usd,
                weight_sum,
                float(implied),
            )
            if validation_status == "FAIL":
                send_alert(
                    "13F Ingest: validation FAIL",
                    f"Quarter {quarter}: {json.dumps(validation_details)}",
                )
                overall_status = "partial_failure"
            clean_df["quarter"] = quarter
            # Load previous quarter agg from DB for accurate delta/change_type computation
            prev_agg = await _load_prev_quarter_agg(quarter)
            agg_df = build_agg_for_quarter(clean_df, quarter, prev_agg)
            meta = {
                "quarter": quarter,
                "used_accessions": merge_meta.get("used_accessions", []),
                "amendment_types": merge_meta.get("amendment_types", []),
                "unit_multiplier": mult,
                "unit_reason": reason,
                "total_value_usd": total_usd,
                "weight_sum_pct": weight_sum,
                "implied_price_median": float(implied),
                "num_holdings": len(clean_df),
                "validation_status": validation_status,
                "validation_details": validation_details,
                "sec_filing_urls": [
                    f"https://www.sec.gov/Archives/edgar/data/1067983/{acc}/"
                    for acc in merge_meta.get("used_accessions", [])
                ],
            }
            raw_df = merged.copy()
            raw_df["quarter"] = quarter
            paths = write_artifacts(quarter, raw_df, clean_df, agg_df, meta, output_dir)
            drive_urls = await save_to_google_drive(paths, drive_folder_id or "")
            meta["drive_urls"] = drive_urls
            try:
                from app.ingestion.db_persist import persist_quarter_to_db

                await persist_quarter_to_db(quarter, clean_df, agg_df, meta)
            except Exception as e:
                logger.warning("db_persist_failed", quarter=quarter, error=str(e))
            summary["success"].append(quarter)
            logger.info(
                "quarter_processed",
                quarter=quarter,
                validation_status=validation_status,
                total_value_usd=total_usd,
            )

        summary["duration_s"] = (datetime.utcnow() - start).total_seconds()

        # Send success summary alert if any quarters were newly processed
        if summary["success"]:
            send_success_alert(
                quarters=summary["success"],
                duration_s=summary["duration_s"],
            )

        await _update_scheduler_state(overall_status)
        return summary
    except Exception as e:
        logger.exception("ingest_failed", error=str(e))
        summary["failed"].append({"error": str(e)})
        send_alert("13F Ingest: pipeline failed", str(e))
        summary["duration_s"] = (datetime.utcnow() - start).total_seconds()
        await _update_scheduler_state("failed")
        return summary


def _main() -> None:
    """CLI: run ingest (optionally only recent filings)."""
    import argparse

    parser = argparse.ArgumentParser(description="Run BRK 13F ingest pipeline")
    parser.add_argument(
        "--recent-only",
        action="store_true",
        help="Only fetch filings from the last 6 months (latest 1–2 quarters)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-process quarters already in the database",
    )
    args = parser.parse_args()
    since = None
    if args.recent_only:
        from datetime import timedelta

        since = date.today() - timedelta(days=180)
        logger.info("recent_only", since_date=str(since))
    result = asyncio.run(run_ingest(since_date=since, force=args.force))
    print(json.dumps(result, indent=2))
    if result.get("failed"):
        raise SystemExit(1)


if __name__ == "__main__":
    _main()
