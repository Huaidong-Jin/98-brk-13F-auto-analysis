"""End-to-end smoke test for Story Mode stack.

This exercises the main API endpoints that the frontend Story Mode
homepage depends on, against a real in-memory DB with sample data.
"""

from __future__ import annotations

import json
from datetime import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import get_engine, get_session_maker, init_db
from app.main import app
from app.models import FilingMeta, HoldingAgg


@pytest.mark.asyncio
async def test_story_mode_end_to_end_smoke() -> None:
    """Populate a minimal quarter and hit the key Story Mode endpoints."""
    database_url = "sqlite+aiosqlite:///:memory:"
    engine = get_engine(database_url)
    app.state.engine = engine
    app.state.session_maker = get_session_maker(engine)
    await init_db(engine)

    session_maker = get_session_maker(engine)
    async with session_maker() as session:
        # Insert one synthetic quarter with two holdings so that summary,
        # concentration, and changes endpoints have something to work with.
        meta = FilingMeta(
            quarter="2024Q4",
            used_accessions=json.dumps(["acc-001"]),
            amendment_types=json.dumps(["13F-HR"]),
            unit_multiplier=1000,
            unit_reason="test",
            total_value_usd=300_000_000.0,
            weight_sum_pct=100.0,
            implied_price_median=150.0,
            num_holdings=2,
            validation_status="PASS",
            validation_details=json.dumps({}),
            drive_urls=json.dumps({}),
            sec_filing_urls=json.dumps(["https://sec.example/filing"]),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        top1 = HoldingAgg(
            quarter="2024Q4",
            cusip="CUSIP1",
            issuer_name="Alpha Corp",
            ticker="ALPHA",
            value_usd=200_000_000.0,
            shares=2_000_000,
            weight_pct=66.7,
            rank=1,
            prev_quarter="2024Q3",
            prev_value_usd=180_000_000.0,
            prev_weight_pct=60.0,
            delta_value_usd=20_000_000.0,
            delta_weight_pct=6.7,
            change_type="INCREASED",
        )
        top2 = HoldingAgg(
            quarter="2024Q4",
            cusip="CUSIP2",
            issuer_name="Beta Corp",
            ticker="BETA",
            value_usd=100_000_000.0,
            shares=1_000_000,
            weight_pct=33.3,
            rank=2,
            prev_quarter="2024Q3",
            prev_value_usd=120_000_000.0,
            prev_weight_pct=40.0,
            delta_value_usd=-20_000_000.0,
            delta_weight_pct=-6.7,
            change_type="DECREASED",
        )
        session.add(meta)
        session.add(top1)
        session.add(top2)
        await session.commit()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        # Home summary
        r_summary = await client.get("/api/v1/summary")
        assert r_summary.status_code == 200
        summary = r_summary.json()
        assert summary["latest_quarter"] == "2024Q4"
        assert summary["total_value_usd"] == pytest.approx(300_000_000.0)
        assert summary["portfolio_trend"]
        assert summary["concentration_trend"]
        # Story-mode specific fields should be present
        assert summary["top1_name"] == "Alpha Corp"
        assert summary["top1_value_usd"] == pytest.approx(200_000_000.0)
        assert summary["top10_value_usd"] == pytest.approx(300_000_000.0)

        # Quarter list
        r_quarters = await client.get("/api/v1/quarters")
        assert r_quarters.status_code == 200
        quarters = r_quarters.json()
        assert any(q["quarter"] == "2024Q4" for q in quarters)

        # Quarter detail
        r_detail = await client.get("/api/v1/quarters/2024Q4")
        assert r_detail.status_code == 200
        detail = r_detail.json()
        assert detail["meta"]["quarter"] == "2024Q4"
        assert len(detail["top_holdings"]) == 2

        # Full holdings table
        r_full = await client.get("/api/v1/quarters/2024Q4/holdings_full")
        assert r_full.status_code == 200
        full = r_full.json()
        assert len(full) == 2

        # Changes leaderboard (Story Mode chart 3)
        r_changes = await client.get(
            "/api/v1/quarters/2024Q4/changes_leaderboard?sort_metric=value_usd"
        )
        assert r_changes.status_code == 200
        changes = r_changes.json()
        assert changes["quarter"] == "2024Q4"
        # We expect one BUY and one SELL row based on change_type
        assert len(changes["buys"]) >= 1
        assert len(changes["sells"]) >= 1

        # Health endpoint should still respond OK
        r_health = await client.get("/api/v1/health")
        assert r_health.status_code == 200
        health = r_health.json()
        assert "status" in health
        assert "db_ok" in health

    await engine.dispose()

