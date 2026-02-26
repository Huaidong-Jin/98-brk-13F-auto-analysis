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
from app.ingestion.alerts import send_alert
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


async def run_ingest(
    output_dir: Path | None = None,
    drive_folder_id: str | None = None,
    since_date: date | None = None,
) -> dict[str, Any]:
    """
    Full pipeline: fetch 13F filings for BRK, group by period_of_report,
    merge amendments, detect unit, normalize, validate, write artifacts, optional Drive upload.
    Returns summary dict: new_filings, success, failed, duration_s, etc.
    """
    from app.drive import save_to_google_drive

    output_dir = output_dir or Path("data/artifacts")
    output_dir.mkdir(parents=True, exist_ok=True)
    start = datetime.utcnow()
    summary: dict[str, Any] = {
        "new_filings": 0,
        "success": [],
        "failed": [],
        "duration_s": 0,
    }
    try:
        filings = await fetch_filings(BRK_CIK, since_date=since_date)
        summary["new_filings"] = len(filings)
        logger.info("fetched_filings", count=len(filings), cik=BRK_CIK)
        if not filings:
            summary["duration_s"] = (datetime.utcnow() - start).total_seconds()
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
            clean_df["quarter"] = quarter
            prev_agg = None
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
        return summary
    except Exception as e:
        logger.exception("ingest_failed", error=str(e))
        summary["failed"].append({"error": str(e)})
        send_alert("13F Ingest: pipeline failed", str(e))
        summary["duration_s"] = (datetime.utcnow() - start).total_seconds()
        return summary
