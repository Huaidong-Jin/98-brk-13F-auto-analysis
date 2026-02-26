"""Database engine and session helpers. SQLite (MVP) or Postgres via DATABASE_URL."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from app.models import (
    HoldingRaw,
    HoldingClean,
    HoldingAgg,
    FilingMeta,
    SchedulerState,
)  # noqa: F401 - register tables


def get_engine(database_url: str):
    """Create async engine from DATABASE_URL (sqlite+aiosqlite or postgresql+asyncpg)."""
    return create_async_engine(
        database_url,
        echo=False,
    )


def get_session_maker(engine):
    """Return async session maker."""
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency: yield async session. Caller must set engine/session_maker on app state."""
    from app.main import app

    session_maker = getattr(app.state, "session_maker", None)
    if not session_maker:
        raise RuntimeError("session_maker not set on app.state")
    async with session_maker() as session:
        yield session


async def init_db(engine) -> None:
    """Create all tables (for dev); production uses Alembic migrations."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
