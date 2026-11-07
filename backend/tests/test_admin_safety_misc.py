import datetime
import pytest
from tests.helpers import client, register, login, bearer
from app.services.safety_layer import check_message_safety, check_ai_reply_safety
from app.services.rate_limit import SlidingWindowLimiter
from app.services.reminders import run_reminder_pass
from app.database import db_manager


def test_hinglish_crisis_phrases_are_caught():
    for text in ["mujhe marna chahta hu", "ab jeena nahi chahti", "khudkushi ke baare mein soch raha hoon", "I wish I was dead"]:
        assert check_message_safety(text)[0] is True, text
    assert check_message_safety("main exam se thak gaya hoon")[0] is False
    assert check_message_safety("this assignment is killing me softly")[0] is False


def test_unsafe_ai_replies_are_replaced():
    for bad in ["You should take 400 mg tonight.", "Stop taking your medication, you don't need it.", "You definitely have depression."]:
        unsafe, shown = check_ai_reply_safety(bad)
        assert unsafe and "can't give medical advice" in shown, bad
    assert check_ai_reply_safety("Let's try box breathing together.") == (False, "Let's try box breathing together.")


def test_rate_limiter_blocks_then_recovers():
    lim = SlidingWindowLimiter()
    assert all(lim.check("1.2.3.4", "login", 3, 60, now=t)[0] for t in (0, 1, 2))
    ok, retry = lim.check("1.2.3.4", "login", 3, 60, now=3)
    assert ok is False and retry > 0
    assert lim.check("9.9.9.9", "login", 3, 60, now=3)[0] is True   # other people unaffected
    assert lim.check("1.2.3.4", "login", 3, 60, now=100)[0] is True  # window passed


@pytest.mark.asyncio
async def test_crisis_events_logged_without_content_and_admin_stats_are_aggregate():
    async with client() as c:
        student = bearer(await register(c, "crisis.logger@example.com"))
        sid = (await c.post("/api/chat/sessions", headers=student, json={"title": "x"})).json()["id"]
        await c.post(f"/api/chat/sessions/{sid}/messages", headers=student, json={"content": "I want to end my life"})

        events = await db_manager.get_collection("crisis_events").find({}).to_list(length=100)
        assert events and "end my life" not in str(events)

        admin = bearer(await login(c, "admin@serenova.demo"))
        log = (await c.get("/api/admin/crisis-events", headers=admin)).json()
        assert log and set(log[0]) == {"id", "source", "created_at"}
        stats = (await c.get("/api/admin/stats", headers=admin)).json()
        assert stats["crisis_events"]["last_30_days"] >= 1
        assert "crisis.logger" not in str(stats)


@pytest.mark.asyncio
async def test_small_groups_are_hidden_when_threshold_set(monkeypatch):
    from app.config import settings
    monkeypatch.setattr(settings, "MIN_GROUP_SIZE", 5)
    async with client() as c:
        student = bearer(await register(c, "tiny.group@example.com"))
        await c.post("/api/assessments", headers=student, json={"answers": [{"question_id": i, "score": 0} for i in range(1, 21)]})
        admin = bearer(await login(c, "admin@serenova.demo"))
        stats = (await c.get("/api/admin/stats", headers=admin)).json()
        assert all(v is None for v in stats["screening_latest_by_category"].values())
        assert stats["average_mood_30_days"] is None


@pytest.mark.asyncio
async def test_admin_can_give_a_counsellor_a_login():
    async with client() as c:
        admin = bearer(await login(c, "admin@serenova.demo"))
        res = await c.post("/api/admin/counsellor-accounts", headers=admin, json={
            "counsellor_id": "counsellor-04", "name": "Someone New", "email": "new.login@example.com", "password": "NewLogin123"})
        assert res.status_code in (200, 400)  # 400 if the demo login for this profile already exists
        dup = await c.post("/api/admin/counsellor-accounts", headers=admin, json={
            "counsellor_id": "counsellor-04", "name": "Again", "email": "again@example.com", "password": "AgainPass12"})
        assert dup.status_code == 400


@pytest.mark.asyncio
async def test_appointment_reminder_goes_out_once():
    async with client() as c:
        student = bearer(await register(c, "remind.me@example.com"))
        ananya = next(x for x in (await c.get("/api/counsellors")).json() if x["id"] == "counsellor-01")
        from tests.helpers import next_slot_date
        date = next_slot_date(ananya, 1)
        slot = ananya["available_slots"][0]
        appt = (await c.post("/api/appointments", headers=student, json={
            "counsellor_id": "counsellor-01", "support_type": "general_support", "preferred_date": date, "time_slot": slot})).json()
        counsellor = bearer(await login(c, "ananya.sen@serenova.demo"))
        await c.patch(f"/api/counsellor/appointments/{appt['id']}", headers=counsellor, json={"status": "confirmed"})

        when = datetime.datetime.strptime(f"{date} {slot}", "%Y-%m-%d %I:%M %p")
        first = await run_reminder_pass(now=when - datetime.timedelta(hours=20))
        second = await run_reminder_pass(now=when - datetime.timedelta(hours=19))
        assert first["appointments"] >= 1 and second["appointments"] == 0
        early = await run_reminder_pass(now=when - datetime.timedelta(days=5))
        assert early["appointments"] == 0
