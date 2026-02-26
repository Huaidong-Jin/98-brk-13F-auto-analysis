# BRK 13F API — Cloud Run
FROM python:3.11-slim

WORKDIR /app

# Install deps
RUN pip install --no-cache-dir poetry
COPY pyproject.toml poetry.lock* ./
RUN poetry config virtualenvs.create false && poetry install --no-dev --no-interaction --no-root

# App
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080

# Render/Cloud Run set PORT at runtime
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
