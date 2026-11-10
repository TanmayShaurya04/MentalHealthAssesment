import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from app.models import UserProfileUpdate, ChangePassword, DeleteAccount, ConsentUpdate, VerifyPassword, SafetyPlan
from app.auth import get_current_user, public_user, hash_password, verify_password, clear_session_cookie
from app.database import db_manager

router = APIRouter(prefix="/api/users", tags=["Users"])

# Every collection that holds a student's own records (key = field that stores their user id).
USER_OWNED = [
    ("moods", "user_id"),
    ("journals", "user_id"),
    ("assessments", "user_id"),
    ("appointments", "user_id"),
    ("chat_sessions", "user_id"),
    ("chat_messages", "user_id"),
]

CONSENT_VERSION = "2026-11"


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return public_user(current_user)


@router.patch("/me")
async def update_profile(payload: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    users_col = db_manager.get_collection("users")
    user_id = str(current_user["_id"])

    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name.strip()

    profile = dict(current_user.get("profile", {}))
    if payload.university is not None:
        profile["university"] = payload.university.strip()
    if payload.year_of_study is not None:
        profile["year_of_study"] = payload.year_of_study.strip()
    if payload.avatar_color is not None:
        profile["avatar_color"] = payload.avatar_color
    if payload.daily_reminder is not None:
        profile["daily_reminder"] = payload.daily_reminder
    if payload.language is not None:
        profile["language"] = payload.language

    update_data["profile"] = profile
    update_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await users_col.update_one({"_id": user_id}, {"$set": update_data})

    updated = await users_col.find_one({"_id": user_id})
    return public_user(updated)


@router.post("/me/change-password")
async def change_password(payload: ChangePassword, current_user: dict = Depends(get_current_user)):
    users_col = db_manager.get_collection("users")
    full = await users_col.find_one({"_id": current_user["_id"]})
    if not verify_password(payload.current_password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Your current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="Please choose a password you haven't used just now")
    await users_col.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password),
                  "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}},
    )
    return {"message": "Password updated"}


@router.post("/me/verify-password")
async def verify_my_password(payload: VerifyPassword, current_user: dict = Depends(get_current_user)):
    """Used by the screen lock: confirms the signed-in user's password without starting a new session."""
    full = await db_manager.get_collection("users").find_one({"_id": current_user["_id"]})
    if not verify_password(payload.password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="That password is not correct")
    return {"ok": True}


def _clean(items):
    return [s.strip() for s in items if s and s.strip()]


@router.get("/me/safety-plan")
async def get_safety_plan(current_user: dict = Depends(get_current_user)):
    return current_user.get("safety_plan") or SafetyPlan().model_dump()


@router.put("/me/safety-plan")
async def save_safety_plan(payload: SafetyPlan, current_user: dict = Depends(get_current_user)):
    plan = payload.model_dump()
    for key in ("warning_signs", "coping_strategies", "distractions", "safe_places"):
        plan[key] = _clean(plan[key])
    plan["contacts"] = [c for c in plan["contacts"] if c["name"].strip() or c["phone"].strip()]
    plan["reasons_to_live"] = plan["reasons_to_live"].strip()
    plan["safe_environment"] = plan["safe_environment"].strip()
    plan["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await db_manager.get_collection("users").update_one({"_id": current_user["_id"]}, {"$set": {"safety_plan": plan}})
    return plan


@router.post("/me/consent")
async def record_consent(payload: ConsentUpdate, current_user: dict = Depends(get_current_user)):
    consent = {"version": payload.version, "accepted_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    await db_manager.get_collection("users").update_one({"_id": current_user["_id"]}, {"$set": {"consent": consent}})
    return {"consent": consent}


@router.get("/me/export")
async def export_my_data(current_user: dict = Depends(get_current_user)):
    """Everything Serenova holds about the signed-in user, as one JSON document."""
    user_id = str(current_user["_id"])
    out = {
        "exported_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "account": public_user(current_user),
        "safety_plan": current_user.get("safety_plan"),
    }
    for name, field in USER_OWNED:
        docs = await db_manager.get_collection(name).find({field: user_id}).to_list(length=100000)
        out[name] = docs
    # Counsellors' private session notes are the counsellor's records, not part of the student's export.
    for appt in out.get("appointments", []):
        appt.pop("counsellor_note", None)
    return out


@router.delete("/me")
async def delete_my_account(payload: DeleteAccount, response: Response, current_user: dict = Depends(get_current_user)):
    """Permanently deletes the account and every record that belongs to it."""
    users_col = db_manager.get_collection("users")
    full = await users_col.find_one({"_id": current_user["_id"]})
    if not verify_password(payload.password, full.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Password is incorrect")
    if current_user.get("role", "student") != "student":
        raise HTTPException(status_code=400, detail="Counsellor and admin accounts can't be deleted from the app. Ask an administrator.")

    user_id = str(current_user["_id"])
    for name, field in USER_OWNED:
        await db_manager.get_collection(name).delete_many({field: user_id})
    # Crisis-event log keeps no message text; we remove the link to the person.
    await db_manager.get_collection("crisis_events").update_many({"user_id": user_id}, {"$set": {"user_id": None}})
    await users_col.delete_one({"_id": user_id})
    clear_session_cookie(response)
    return {"message": "Your account and data have been deleted."}
