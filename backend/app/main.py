"""FastAPI entrypoint for BRK 13F API."""

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings

from app.api.routes import router as api_router
from app.db import get_engine, get_session_maker, init_db
from app.scheduler import register_scheduler


class Settings(BaseSettings):
    """App settings from env."""

    model_config = {"env_file": ".env", "extra": "ignore"}
    database_url: str = "sqlite+aiosqlite:///./data/brk13f.db"
    sec_user_agent: str = "Jimmy jimmyandone@gmail.com"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create engine and session maker; run migrations on startup; start scheduler."""
    settings = Settings()
    engine = get_engine(settings.database_url)
    app.state.engine = engine
    app.state.session_maker = get_session_maker(engine)
    await init_db(engine)
    scheduler = AsyncIOScheduler()
    register_scheduler(scheduler)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)
    await engine.dispose()


app = FastAPI(
    title="BRK 13F API",
    description="Berkshire Hathaway 13F holdings tracker API",
    version="0.1.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
