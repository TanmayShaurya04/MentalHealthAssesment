import datetime
from httpx import AsyncClient, ASGITransport
from app.main import app

NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def next_slot_date(counsellor, start_in_days=2):
    d = datetime.date.today() + datetime.timedelta(days=start_in_days)
    while NAMES[d.weekday()] not in counsellor["available_days"]:
        d += datetime.timedelta(days=1)
    return d.isoformat()


async def register(c, email, name="Test Student", password="Passw0rdOK"):
    res = await c.post("/api/auth/register", json={"name": name, "email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()


async def login(c, email, password="password123"):
    res = await c.post("/api/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()


def bearer(body):
    return {"Authorization": f"Bearer {body['access_token']}"}
