# BRK 13F Tracker

Berkshire Hathaway 13F holdings — automatic fetch, clean, and “10-second看懂” web UI.

## One-line goal

Turn complex 13F data into an interactive site: auto ingest, normalized data, visual story, one-click download, full traceability.

## Stack

- **Backend**: Python 3.11, FastAPI, SQLModel, APScheduler. Ingest: SEC EDGAR → raw/clean/agg → SQLite (MVP) / Postgres (prod) + optional Google Drive.
- **Frontend**: Next.js (App Router), TypeScript, Tailwind, design tokens, ChartFrame + 4 pages (Home, Quarter, Holding, Download).
- **Deploy**: Backend → Cloud Run (Dockerfile in `backend/`). Frontend → Vercel. Cron ingest → GitHub Actions triggering Cloud Run Job (see `.github/workflows/ingest.yml`).

## Quick start

1. **Backend**
   ```bash
   cd backend
   cp ../.env.example .env   # set DATABASE_URL, SEC_USER_AGENT, etc.
   poetry install
   poetry run alembic upgrade head
   poetry run uvicorn app.main:app --reload
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
   ```

3. **Ingest (once)**  
   From repo root with backend venv:
   ```bash
   cd backend && poetry run python -c "
   import asyncio
   from app.ingestion.run import run_ingest
   asyncio.run(run_ingest())
   "
   ```

## Docs

- `docs/design-system.md` — colors, type, spacing
- `docs/chart-style-guide.md` — chart title, how-to-read, tooltip
- `docs/acceptance-tests.md` — data and frontend DoD
- `CURSOR_RULES.md` — dev rules (no rainbow, no hardcoded hex, traceability)

## Deploy to web (GitHub + Vercel + Render)

To put the project on GitHub and run it in the browser: **[docs/DEPLOY.md](docs/DEPLOY.md)** — 把项目放到 GitHub、前端部署到 Vercel、后端部署到 Render，然后在网页上直接测试。

## Secrets

See `.env.example`. Required for full run: `DATABASE_URL`, `SEC_USER_AGENT`, optional: `GOOGLE_DRIVE_*`, `SLACK_WEBHOOK_URL`.
