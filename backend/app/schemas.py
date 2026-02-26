"""Pydantic response schemas for API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class NarrativeOut(BaseModel):
    """Auto-generated narrative answers to the 3 core questions."""

    question1: str
    question2: str
    question3: str


class SummaryOut(BaseModel):
    """GET /api/v1/summary response."""

    latest_quarter: str | None
    total_value_usd: float | None
    num_holdings: int | None
    top1_pct: float | None
    top5_pct: float | None
    top10_pct: float | None
    portfolio_trend: list[dict[str, Any]]
    concentration_trend: list[dict[str, Any]]
    narrative: NarrativeOut | None


class QuarterListItem(BaseModel):
    quarter: str
    total_value_usd: float
    num_holdings: int
    validation_status: str


class HoldingAggItem(BaseModel):
    quarter: str
    cusip: str
    issuer_name: str
    ticker: str | None
    value_usd: float
    shares: int
    weight_pct: float
    rank: int
    prev_quarter: str | None
    prev_value_usd: float | None
    prev_weight_pct: float | None
    delta_value_usd: float | None
    delta_weight_pct: float | None
    change_type: str | None


class FilingMetaOut(BaseModel):
    quarter: str
    used_accessions: list[str]
    amendment_types: list[str]
    unit_multiplier: int
    unit_reason: str
    total_value_usd: float
    weight_sum_pct: float
    implied_price_median: float
    num_holdings: int
    validation_status: str
    validation_details: dict[str, Any]
    drive_urls: dict[str, str]
    sec_filing_urls: list[str]
    created_at: str | None
    updated_at: str | None


class QuarterDetailOut(BaseModel):
    meta: FilingMetaOut
    top_holdings: list[HoldingAggItem]
    changes: dict[str, list[HoldingAggItem]]


class HoldingTimeSeriesItem(BaseModel):
    quarter: str
    value_usd: float
    weight_pct: float
    shares: int
    rank: int


class HoldingDetailOut(BaseModel):
    issuer_name: str
    ticker: str | None
    cusip: str
    time_series: list[HoldingTimeSeriesItem]


class ArtifactItem(BaseModel):
    artifact_type: str
    quarter: str
    generated_at: str | None
    validation_status: str
    download_url: str | None


class HealthOut(BaseModel):
    status: str
    db_ok: bool
    drive_ok: bool | None
    last_ingest_at: str | None
    last_ingest_status: str | None
