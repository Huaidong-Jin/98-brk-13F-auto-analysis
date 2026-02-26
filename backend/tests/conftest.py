"""Pytest fixtures. Use in-memory SQLite for tests."""

import os
import pytest

# Use in-memory SQLite for tests so we don't touch disk
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
