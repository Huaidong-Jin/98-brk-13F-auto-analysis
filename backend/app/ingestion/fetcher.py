"""
SEC EDGAR fetcher: submissions JSON, filing index, infotable XML.
User-Agent required; rate limit 10 req/s; retry 3 times.
"""

from __future__ import annotations

import asyncio
import os
import re
from datetime import date
from typing import Any

import httpx

BRK_CIK = "0001067983"
BASE_URL = "https://data.sec.gov"
# Filing files (index.json, infotable XML) live on www.sec.gov, not data.sec.gov
ARCHIVES_BASE = "https://www.sec.gov"
SUBMISSIONS_URL = f"{BASE_URL}/submissions/CIK{BRK_CIK}.json"
RATE_LIMIT_DELAY = 0.11  # ~9 req/s to stay under 10

# SEC requires User-Agent with contact (name + email)
DEFAULT_USER_AGENT = "Jimmy jimmyandone@gmail.com"


def _sec_headers(accept_json: bool = False) -> dict[str, str]:
    h = {"User-Agent": os.environ.get("SEC_USER_AGENT", DEFAULT_USER_AGENT)}
    if accept_json:
        h["Accept"] = "application/json"
    return h


def _normalize_accession(acc: str) -> str:
    """Remove dashes for storage/key: 0001067983-24-000069 -> 000106798324000069."""
    return re.sub(r"-", "", acc) if acc else ""


async def _request_with_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    max_retries: int = 3,
) -> dict[str, Any] | bytes:
    """GET with retries; returns JSON dict or bytes for XML."""
    last_err: Exception | None = None
    for attempt in range(max_retries):
        try:
            r = await client.get(url)
            r.raise_for_status()
            content_type = r.headers.get("content-type", "")
            if "json" in content_type:
                return r.json()
            return r.content
        except (httpx.HTTPStatusError, httpx.RequestError) as e:
            last_err = e
            if attempt < max_retries - 1:
                await asyncio.sleep(2**attempt)
    raise last_err or RuntimeError("request failed")


async def fetch_filings(
    cik: str,
    since_date: date | None = None,
    form_types: list[str] | None = None,
    *,
    client: httpx.AsyncClient | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch SEC EDGAR submissions for CIK; filter by form type and optional since_date.
    Returns list of filing dicts with accessionNumber, form, filingDate, reportDate, etc.
    """
    form_types = form_types or ["13F-HR", "13F-HR/A"]
    # SEC expects CIK zero-padded to 10 digits
    cik_pad = cik.strip().zfill(10)
    url = f"{BASE_URL}/submissions/CIK{cik_pad}.json"
    async with client or httpx.AsyncClient(
        timeout=30.0, headers=_sec_headers()
    ) as c:
        data = await _request_with_retry(c, url)
        assert isinstance(data, dict)
    recent = data.get("filings", {}).get("recent") or data.get("recent")
    if not recent or not isinstance(recent, dict):
        return []
    acc_list = recent.get("accessionNumber") or []
    form_list = recent.get("form") or []
    filing_dates = recent.get("filingDate") or []
    report_dates = recent.get("reportDate") or []
    primary_doc = recent.get("primaryDocument") or []
    result: list[dict[str, Any]] = []
    for i, acc in enumerate(acc_list):
        form = form_list[i] if i < len(form_list) else ""
        if form not in form_types:
            continue
        fd = filing_dates[i] if i < len(filing_dates) else ""
        rd = report_dates[i] if i < len(report_dates) else ""
        if since_date and fd:
            try:
                d = date.fromisoformat(fd)
                if d < since_date:
                    continue
            except ValueError:
                pass
        result.append(
            {
                "accessionNumber": acc,
                "form": form,
                "filingDate": fd,
                "reportDate": rd,
                "primaryDocument": primary_doc[i] if i < len(primary_doc) else "",
            }
        )
        await asyncio.sleep(RATE_LIMIT_DELAY)
    return result


def _ensure_dict(data: dict[str, Any] | bytes, url: str) -> dict[str, Any]:
    """If SEC returns bytes (e.g. content-type not set), parse as JSON."""
    if isinstance(data, dict):
        return data
    if isinstance(data, bytes):
        import json
        try:
            return json.loads(data.decode("utf-8", errors="replace"))
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Expected JSON from {url}, got bytes (first 200 chars): {data[:200]!r}"
            ) from e
    raise ValueError(f"Expected dict or bytes from {url}, got {type(data)}")


async def fetch_filing_index(
    accession_number: str, cik: str = BRK_CIK
) -> dict[str, Any]:
    """Fetch index.json for a filing. accession_number may include or omit dashes."""
    acc_clean = _normalize_accession(accession_number)
    # SEC path: Archives/edgar/data/{cik_no_leading_zeros}/{acc_NO_dashes}/index.json
    cik_stripped = cik.lstrip("0") or "0"
    url = f"{ARCHIVES_BASE}/Archives/edgar/data/{cik_stripped}/{acc_clean}/index.json"
    async with httpx.AsyncClient(
        timeout=30.0, headers=_sec_headers(accept_json=True)
    ) as client:
        data = await _request_with_retry(client, url)
    return _ensure_dict(data, url)


def _find_infotable_file(index: dict[str, Any]) -> str | None:
    """From index.json directory listing, find the 13F infotable XML file name."""
    directory = index.get("directory", {})
    if isinstance(directory, dict):
        items = directory.get("item", [])
    else:
        items = directory if isinstance(directory, list) else []
    if not isinstance(items, list):
        items = [items]
    xml_candidates: list[str] = []
    for item in items:
        name = item.get("name", "") if isinstance(item, dict) else ""
        if not name or not name.endswith(".xml"):
            continue
        if "infotable" in name.lower() or "informationtable" in name.lower():
            return name
        if "index" in name.lower():
            continue
        xml_candidates.append(name)
    # Fallback: 13F infotable is often a numbered .xml (e.g. 50240.xml), not primary_doc
    for c in xml_candidates:
        if c != "primary_doc.xml" and c[0].isdigit():
            return c
    if "primary_doc.xml" in xml_candidates:
        return "primary_doc.xml"
    return xml_candidates[0] if xml_candidates else None


async def download_infotable(
    cik: str,
    accession_number: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> bytes:
    """From index.json locate infotable XML and download; return raw bytes."""
    index = await fetch_filing_index(accession_number, cik)
    name = _find_infotable_file(index)
    if not name:
        raise FileNotFoundError(f"No infotable XML in index for {accession_number}")
    acc_clean = _normalize_accession(accession_number)
    cik_stripped = cik.lstrip("0") or "0"
    url = f"{ARCHIVES_BASE}/Archives/edgar/data/{cik_stripped}/{acc_clean}/{name}"
    async with client or httpx.AsyncClient(
        timeout=60.0, headers=_sec_headers()
    ) as c:
        data = await _request_with_retry(c, url)
        assert isinstance(data, bytes)
    return data
