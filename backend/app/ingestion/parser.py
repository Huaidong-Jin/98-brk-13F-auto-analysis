"""
Parse 13F infotable XML to raw DataFrame.
Handles namespace variants and null value; outputs raw schema columns.
"""

from __future__ import annotations

from datetime import date, datetime
from io import BytesIO
from typing import Any

import pandas as pd

# 13F XML often uses namespace; we strip or use local names for compatibility
NS_MAP = {"ns": "http://www.sec.gov/edgar/document/thirteenf/informationtable"}


def _local_name(tag: str) -> str:
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def parse_infotable(
    xml_bytes: bytes,
    accession_number: str,
    period_of_report: date,
    *,
    filed_date: date | None = None,
    form_type: str = "13F-HR",
    amendment_type: str | None = None,
) -> pd.DataFrame:
    """
    Parse 13F infotable XML into a DataFrame with raw schema columns.
    accession_number: with or without dashes (stored normalized).
    """
    import xml.etree.ElementTree as ET

    root = ET.fromstring(xml_bytes)
    # Find infoTable elements (with or without namespace)
    tables = root.findall(
        ".//{http://www.sec.gov/edgar/document/thirteenf/informationtable}infoTable"
    )
    if not tables:
        tables = root.findall(".//infoTable")
    rows: list[dict[str, Any]] = []
    for row_index, info in enumerate(tables):

        def text(el: ET.Element | None, tag: str, default: str = "") -> str:
            if el is None:
                return default
            c = el.find(
                f".//{{http://www.sec.gov/edgar/document/thirteenf/informationtable}}{tag}"
            )
            if c is not None and c.text:
                return (c.text or "").strip()
            for child in el:
                if _local_name(child.tag) == tag and child.text:
                    return (child.text or "").strip()
            return default

        def int_val(el: ET.Element | None, tag: str) -> int:
            t = text(el, tag)
            if not t:
                return 0
            try:
                return int(t.replace(",", ""))
            except ValueError:
                return 0

        name = text(info, "nameOfIssuer")
        cusip = text(info, "cusip")
        val = int_val(info, "value")
        sh = int_val(info, "sshPrnAmt")
        sh_type = text(info, "sshPrnamtType") or "SH"
        putcall = text(info, "putCall") or None
        if not putcall or putcall.strip() == "":
            putcall = None
        inv_disc = text(info, "investmentDiscretion") or "SOLE"
        rows.append(
            {
                "accession_number": accession_number.replace("-", ""),
                "cik": "0001067983",
                "period_of_report": period_of_report,
                "filed_date": filed_date or period_of_report,
                "form_type": form_type,
                "amendment_type": amendment_type,
                "issuer_name": name,
                "cusip": cusip,
                "value_raw": val,
                "sshprnamt": sh,
                "sshprnamttype": sh_type,
                "putcall": putcall,
                "investment_discretion": inv_disc,
                "row_index": row_index,
            }
        )
    if not rows:
        return pd.DataFrame(
            columns=[
                "accession_number",
                "cik",
                "period_of_report",
                "filed_date",
                "form_type",
                "amendment_type",
                "issuer_name",
                "cusip",
                "value_raw",
                "sshprnamt",
                "sshprnamttype",
                "putcall",
                "investment_discretion",
                "row_index",
            ]
        )
    return pd.DataFrame(rows)
