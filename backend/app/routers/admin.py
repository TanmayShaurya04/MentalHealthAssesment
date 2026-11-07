"""Admin tools. Statistics are aggregated and small groups are hidden, so no individual can be identified."""
import datetime
from collections import Counter
from fastapi import APIRouter, Depends, HTTPException
from app.config import settings
from app.models import CounsellorAccountCreate
from app.auth import require_roles, hash_password
from app.database import db_manager

router = APIRouter(prefix="/api/admin", tags=["Admin"])
admin_only = require_roles("admin")


def _hide_small(counter: dict) -> dict:
    """Replace any group smaller than MIN_GROUP_SIZE with None (shown as '<N' in the UI)."""
    floor = settings.MIN_GROUP_SIZE
    return {k: (v if v >= floor else None) for k, v in counter.items()}


def _days_ago(iso: str | None) -> float:
    try:
        then = datetime.datetime.fromisoformat((iso or "").replace("Z", "+00:00"))
        if then.tzinfo is None:
            then = then.replace(tzinfo=datetime.timezone.utc)
        return (datetime.datetime.now(datetime.timezone.utc) - then).total_seconds() / 86400
    except ValueError:
        return 10**6


@router.get("/stats")
async def stats(admin: dict = Depends(admin_only)):
    g = db_manager.get_collection
    users = await g("users").find({}).to_list(length=100000)
    students = [u for u in users if u.get("role", "student") == "student"]
    moods = await g("moods").find({}).to_list(length=200000)
    assessments = await g("assessments").find({}).to_list(length=200000)
    appts = await g("appointments").find({}).to_list(length=200000)
    sessions = await g("chat_sessions").find({}).to_list(length=200000)
    crises = await g("crisis_events").find({}).to_list(length=200000)

    # Active = did anything in the last 7 days
    active_ids = {m["user_id"] for m in moods if _days_ago(m.get("recorded_at")) <= 7}
    active_ids |= {a["user_id"] for a in assessments if _days_ago(a.get("taken_at")) <= 7}
    active_ids |= {s["user_id"] for s in sessions if _days_ago(s.get("updated_at")) <= 7}

    # Latest screening per student, then count by category
    latest = {}
    for a in sorted(assessments, key=lambda x: x.get("taken_at", "")):
        latest[a["user_id"]] = a
    screening = Counter(a.get("category", "unknown") for a in latest.values())

    recent_moods = [m["score"] for m in moods if _days_ago(m.get("recorded_at")) <= 30 and "score" in m]
    appt_status = Counter(a.get("status", "pending") for a in appts)
    topics = Counter(s.get("topic", "general") for s in sessions)
    crisis_30 = [c for c in crises if _days_ago(c.get("created_at")) <= 30]

    return {
        "min_group_size": settings.MIN_GROUP_SIZE,
        "students": {"total": len(students), "active_last_7_days": len(active_ids)},
        "screening_latest_by_category": _hide_small(dict(screening)),
        "average_mood_30_days": round(sum(recent_moods) / len(recent_moods), 2) if len(recent_moods) >= max(1, settings.MIN_GROUP_SIZE) else None,
        "appointments_by_status": _hide_small(dict(appt_status)),
        "companion_topics": _hide_small(dict(topics)),
        "crisis_events": {
            "last_30_days": len(crisis_30),
            "by_source": dict(Counter(c.get("source") for c in crisis_30)),
        },
        "note": "Counts only. No names, messages, journal text or individual scores are available here.",
    }


@router.get("/crisis-events")
async def crisis_events(admin: dict = Depends(admin_only)):
    """Recent safety-layer triggers: when and where, never what was written, and not who."""
    docs = await db_manager.get_collection("crisis_events").find({}).sort("created_at", -1).limit(100).to_list(length=100)
    return [{"id": str(d["_id"]), "source": d.get("source"), "created_at": d.get("created_at")} for d in docs]


@router.get("/counsellors")
async def counsellor_accounts(admin: dict = Depends(admin_only)):
    counsellors = await db_manager.get_collection("counsellors").find({}).to_list(length=200)
    accounts = await db_manager.get_collection("users").find({"role": "counsellor"}).to_list(length=200)
    linked = {a.get("counsellor_id"): a for a in accounts}
    return [{"id": c["_id"], "name": c["name"], "is_demo": c.get("is_demo", False),
             "login_email": (linked.get(c["_id"]) or {}).get("email")} for c in counsellors]


@router.post("/counsellor-accounts")
async def create_counsellor_account(payload: CounsellorAccountCreate, admin: dict = Depends(admin_only)):
    """Give a counsellor profile a login, so that person can manage their own requests."""
    g = db_manager.get_collection
    if not await g("counsellors").find_one({"_id": payload.counsellor_id}):
        raise HTTPException(status_code=404, detail="No such counsellor profile")
    if await g("users").find_one({"email": payload.email.lower()}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    if await g("users").find_one({"role": "counsellor", "counsellor_id": payload.counsellor_id}):
        raise HTTPException(status_code=400, detail="That counsellor profile already has a login")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    res = await g("users").insert_one({
        "name": payload.name.strip(), "email": payload.email.lower(), "password_hash": hash_password(payload.password),
        "role": "counsellor", "counsellor_id": payload.counsellor_id, "email_verified": True,
        "created_at": now, "updated_at": now, "profile": {"language": "en"},
    })
    return {"id": str(res.inserted_id), "email": payload.email.lower()}
