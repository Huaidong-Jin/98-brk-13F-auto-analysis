"""Initial schema: holdings_raw, holdings_clean, holdings_agg, filing_meta, scheduler_state.

Revision ID: 001
Revises:
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "holdings_raw",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("accession_number", sa.String(32), nullable=False),
        sa.Column("cik", sa.String(16), nullable=False),
        sa.Column("period_of_report", sa.Date(), nullable=False),
        sa.Column("filed_date", sa.Date(), nullable=False),
        sa.Column("form_type", sa.String(32), nullable=False),
        sa.Column("amendment_type", sa.String(32), nullable=True),
        sa.Column("issuer_name", sa.String(512), nullable=False),
        sa.Column("cusip", sa.String(16), nullable=False),
        sa.Column("value_raw", sa.Integer(), nullable=False),
        sa.Column("sshprnamt", sa.Integer(), nullable=False),
        sa.Column("sshprnamttype", sa.String(8), nullable=False),
        sa.Column("putcall", sa.String(16), nullable=True),
        sa.Column("investment_discretion", sa.String(32), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("ingested_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("accession_number", "row_index", name="uq_holdings_raw_accession_row"),
    )
    op.create_index("ix_holdings_raw_accession_number", "holdings_raw", ["accession_number"])
    op.create_index("ix_holdings_raw_row_index", "holdings_raw", ["row_index"])

    op.create_table(
        "holdings_clean",
        sa.Column("quarter", sa.String(8), nullable=False),
        sa.Column("cusip", sa.String(16), nullable=False),
        sa.Column("putcall", sa.String(16), nullable=True),
        sa.Column("issuer_name", sa.String(512), nullable=False),
        sa.Column("value_raw", sa.Integer(), nullable=False),
        sa.Column("sshprnamt", sa.Integer(), nullable=False),
        sa.Column("unit_multiplier", sa.Integer(), nullable=False),
        sa.Column("unit_reason", sa.String(256), nullable=False),
        sa.Column("value_usd", sa.Float(), nullable=False),
        sa.Column("total_value_usd_q", sa.Float(), nullable=False),
        sa.Column("weight_pct", sa.Float(), nullable=False),
        sa.Column("ticker", sa.String(16), nullable=True),
        sa.PrimaryKeyConstraint("quarter", "cusip", "putcall"),
    )

    op.create_table(
        "holdings_agg",
        sa.Column("quarter", sa.String(8), nullable=False),
        sa.Column("cusip", sa.String(16), nullable=False),
        sa.Column("issuer_name", sa.String(512), nullable=False),
        sa.Column("ticker", sa.String(16), nullable=True),
        sa.Column("value_usd", sa.Float(), nullable=False),
        sa.Column("shares", sa.Integer(), nullable=False),
        sa.Column("weight_pct", sa.Float(), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("prev_quarter", sa.String(8), nullable=True),
        sa.Column("prev_value_usd", sa.Float(), nullable=True),
        sa.Column("prev_weight_pct", sa.Float(), nullable=True),
        sa.Column("delta_value_usd", sa.Float(), nullable=True),
        sa.Column("delta_weight_pct", sa.Float(), nullable=True),
        sa.Column("change_type", sa.String(16), nullable=True),
        sa.PrimaryKeyConstraint("quarter", "cusip"),
    )

    op.create_table(
        "filing_meta",
        sa.Column("quarter", sa.String(8), nullable=False),
        sa.Column("used_accessions", sa.String(), nullable=False),
        sa.Column("amendment_types", sa.String(), nullable=False),
        sa.Column("unit_multiplier", sa.Integer(), nullable=False),
        sa.Column("unit_reason", sa.String(256), nullable=False),
        sa.Column("total_value_usd", sa.Float(), nullable=False),
        sa.Column("weight_sum_pct", sa.Float(), nullable=False),
        sa.Column("implied_price_median", sa.Float(), nullable=False),
        sa.Column("num_holdings", sa.Integer(), nullable=False),
        sa.Column("validation_status", sa.String(16), nullable=False),
        sa.Column("validation_details", sa.String(), nullable=False),
        sa.Column("drive_urls", sa.String(), nullable=False),
        sa.Column("sec_filing_urls", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("quarter"),
    )

    op.create_table(
        "scheduler_state",
        sa.Column("id", sa.String(64), nullable=False),
        sa.Column("last_processed_date", sa.Date(), nullable=True),
        sa.Column("last_run_at", sa.DateTime(), nullable=True),
        sa.Column("last_status", sa.String(32), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("scheduler_state")
    op.drop_table("filing_meta")
    op.drop_table("holdings_agg")
    op.drop_table("holdings_clean")
    op.drop_index("ix_holdings_raw_row_index", "holdings_raw")
    op.drop_index("ix_holdings_raw_accession_number", "holdings_raw")
    op.drop_table("holdings_raw")
