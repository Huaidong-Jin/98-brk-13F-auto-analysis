"""Holdings and filing meta models per plan §3 data contracts."""

from datetime import date, datetime

from sqlmodel import Field, SQLModel


class HoldingRaw(SQLModel, table=True):
    """Raw layer: one row per holding line per accession. Unique (accession_number, row_index)."""

    __tablename__ = "holdings_raw"
    __table_args__ = ({"sqlite_autoincrement": True},)

    id: int | None = Field(default=None, primary_key=True)
    accession_number: str = Field(index=True, max_length=32)
    cik: str = Field(max_length=16)
    period_of_report: date
    filed_date: date
    form_type: str = Field(max_length=32)
    amendment_type: str | None = None
    issuer_name: str = Field(max_length=512)
    cusip: str = Field(max_length=16)
    value_raw: int
    sshprnamt: int
    sshprnamttype: str = Field(max_length=8)
    putcall: str | None = None
    investment_discretion: str = Field(max_length=32)
    row_index: int = Field(index=True)
    ingested_at: datetime = Field(default_factory=datetime.utcnow)


class HoldingClean(SQLModel, table=True):
    """Clean layer: one row per (quarter, cusip, putcall) after merge and normalize."""

    __tablename__ = "holdings_clean"

    quarter: str = Field(primary_key=True, max_length=8)
    cusip: str = Field(primary_key=True, max_length=16)
    putcall: str | None = Field(default=None, primary_key=True)
    issuer_name: str = Field(max_length=512)
    value_raw: int = 0
    sshprnamt: int = 0
    unit_multiplier: int = 1000
    unit_reason: str = Field(max_length=256)
    value_usd: float = 0.0
    total_value_usd_q: float = 0.0
    weight_pct: float = 0.0
    ticker: str | None = None


class HoldingAgg(SQLModel, table=True):
    """Agg layer: per-quarter per-holding summary for frontend."""

    __tablename__ = "holdings_agg"

    quarter: str = Field(primary_key=True, max_length=8)
    cusip: str = Field(primary_key=True, max_length=16)
    issuer_name: str = Field(max_length=512)
    ticker: str | None = None
    value_usd: float = 0.0
    shares: int = 0
    weight_pct: float = 0.0
    rank: int = 0
    prev_quarter: str | None = None
    prev_value_usd: float | None = None
    prev_weight_pct: float | None = None
    delta_value_usd: float | None = None
    delta_weight_pct: float | None = None
    change_type: str | None = None  # NEW | INCREASED | DECREASED | CLOSED | UNCHANGED


class FilingMeta(SQLModel, table=True):
    """Meta/audit per quarter: used accessions, unit, validation, drive URLs."""

    __tablename__ = "filing_meta"

    quarter: str = Field(primary_key=True, max_length=8)
    used_accessions: str = Field(default="[]")  # JSON list
    amendment_types: str = Field(default="[]")  # JSON list
    unit_multiplier: int = 1000
    unit_reason: str = Field(max_length=256)
    total_value_usd: float = 0.0
    weight_sum_pct: float = 0.0
    implied_price_median: float = 0.0
    num_holdings: int = 0
    validation_status: str = Field(max_length=16)  # PASS | WARN | FAIL
    validation_details: str = Field(default="{}")  # JSON
    drive_urls: str = Field(default="{}")  # JSON dict
    sec_filing_urls: str = Field(default="[]")  # JSON list
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SchedulerState(SQLModel, table=True):
    """Last processed date for idempotent ingest."""

    __tablename__ = "scheduler_state"

    id: str = Field(primary_key=True, max_length=64)  # e.g. "ingest"
    last_processed_date: date | None = None
    last_run_at: datetime | None = None
    last_status: str | None = None  # success | failed
    updated_at: datetime = Field(default_factory=datetime.utcnow)
