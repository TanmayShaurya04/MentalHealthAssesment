"""Test setup: every test run gets its own empty data folder, so tests never touch (or depend on) backend/data/."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="serenova-test-")
os.environ["SERENOVA_DATA_DIR"] = _TMP
os.environ.setdefault("DEMO_MODE", "true")
os.environ["RATE_LIMIT_ENABLED"] = "false"   # the limiter itself is tested directly in test_rate_limit.py
os.environ["REMINDERS_ENABLED"] = "false"
os.environ.pop("SMTP_HOST", None)

import pytest_asyncio  # noqa: E402

from app.database import db_manager  # noqa: E402
from app.seed_data import seed_database_if_empty, ensure_demo_data  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def seeded_database():
    db_manager.is_mongo = False
    await seed_database_if_empty()
    await ensure_demo_data()
    # Bookings from one test must not occupy slots another test wants
    await db_manager.get_collection("appointments").delete_many({})
    yield
