"""Health endpoint test."""

import os
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.db import get_engine, get_session_maker, init_db


@pytest.mark.asyncio
async def test_health():
    """GET /api/v1/health returns status and db_ok."""
    database_url = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
    engine = get_engine(database_url)
    app.state.engine = engine
    app.state.session_maker = get_session_maker(engine)
    await init_db(engine)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        r = await client.get("/api/v1/health")
    await engine.dispose()
    assert r.status_code == 200
    data = r.json()
    assert "status" in data
    assert "db_ok" in data
