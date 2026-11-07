"""
Background reminders (run inside the server process):
  - appointment reminder: ~24 hours before a confirmed session
  - optional daily mood check-in nudge for students who switched it on
"""
import asyncio
import datetime

from app.config import settings
from app.database import db_manager
from app.services.appointment_rules import slot_datetime
from app.services.email_service import send_email

CHECK_EVERY_SECONDS = 15 * 60


async def run_reminder_pass(now: datetime.datetime | None = None) -> dict:
    """One sweep. Separate from the loop so it can be tested."""
    now = now or datetime.datetime.now()
    sent = {"appointments": 0, "daily": 0}
    g = db_manager.get_collection

    appts = await g("appointments").find({"status": "confirmed"}).to_list(length=100000)
    for a in appts:
        if a.get("reminded"):
            continue
        when = slot_datetime(a.get("preferred_date", ""), a.get("time_slot", ""))
        if not when or not (datetime.timedelta(0) < when - now <= datetime.timedelta(hours=24)):
            continue
        student = await g("users").find_one({"_id": a.get("user_id")})
        counsellor = await g("counsellors").find_one({"_id": a.get("counsellor_id")})
        if not student:
            continue
        await send_email(
            student["email"],
            "Reminder: your counselling session is tomorrow",
            f"Hi {student['name'].split(' ')[0]},\n\nA reminder that you have a session with {a.get('counsellor_name')} on "
            f"{a['preferred_date']} at {a['time_slot']}.\n\nVideo link: {(counsellor or {}).get('video_meet_link', '')}",
        )
        await g("appointments").update_one({"_id": a["_id"]}, {"$set": {"reminded": True}})
        sent["appointments"] += 1

    utc_now = datetime.datetime.now(datetime.timezone.utc)
    if utc_now.hour >= settings.DAILY_REMINDER_HOUR_UTC:
        today = utc_now.date().isoformat()
        users = await g("users").find({"role": "student"}).to_list(length=100000)
        moods = await g("moods").find({}).to_list(length=200000)
        logged_today = {m["user_id"] for m in moods if str(m.get("recorded_at", "")).startswith(today)}
        for u in users:
            prof = u.get("profile") or {}
            if not prof.get("daily_reminder") or u["_id"] in logged_today or prof.get("last_reminder") == today:
                continue
            await send_email(
                u["email"], "How are you feeling today?",
                f"Hi {u['name'].split(' ')[0]},\n\nA gentle nudge to log today's mood on Serenova. It takes ten seconds: {settings.PUBLIC_URL}/dashboard\n\n"
                "You can turn these reminders off in Settings.",
            )
            prof["last_reminder"] = today
            await g("users").update_one({"_id": u["_id"]}, {"$set": {"profile": prof}})
            sent["daily"] += 1
    return sent


async def reminder_loop():
    while True:
        try:
            await run_reminder_pass()
        except Exception as exc:  # noqa: BLE001
            print(f"[Reminders] pass failed: {exc}")
        await asyncio.sleep(CHECK_EVERY_SECONDS)
