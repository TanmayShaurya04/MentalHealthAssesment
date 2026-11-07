import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.models import AppointmentCreate, AppointmentResponse
from app.auth import get_current_user
from app.database import db_manager
from app.services.email_service import send_email, render_html
from app.services.appointment_rules import validate_slot

router = APIRouter(prefix="/api/appointments", tags=["Counselling Appointments"])

ACTIVE = ("pending", "confirmed")


def _with_link(doc: dict, counsellor: dict | None = None) -> dict:
    """Attach the video link only once the counsellor has confirmed."""
    doc["id"] = str(doc["_id"])
    doc.pop("counsellor_note", None)  # private to the counsellor
    if doc.get("status") == "confirmed" and counsellor:
        doc["video_meet_link"] = counsellor.get("video_meet_link")
    return doc


async def _counsellor_email(counsellor_id: str) -> str | None:
    acct = await db_manager.get_collection("users").find_one({"counsellor_id": counsellor_id})
    return acct["email"] if acct else None


@router.post("", response_model=AppointmentResponse)
async def book_appointment(payload: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role", "student") != "student":
        raise HTTPException(status_code=403, detail="Only student accounts can book appointments.")

    user_id = str(current_user["_id"])
    counsellor = await db_manager.get_collection("counsellors").find_one({"_id": payload.counsellor_id})
    if not counsellor:
        raise HTTPException(status_code=404, detail="Selected counsellor does not exist")
    if not counsellor.get("is_accepting_students", True):
        raise HTTPException(status_code=409, detail="This counsellor is not accepting new students right now.")

    validate_slot(counsellor, payload.preferred_date, payload.time_slot)

    app_col = db_manager.get_collection("appointments")
    # One slot, one student: block double-booking for anyone with a live request on that slot.
    clash = [
        a for a in await app_col.find({"counsellor_id": payload.counsellor_id, "preferred_date": payload.preferred_date,
                                       "time_slot": payload.time_slot}).to_list(length=50)
        if a.get("status") in ACTIVE
    ]
    if clash:
        raise HTTPException(status_code=409, detail="That slot has just been taken. Please pick another time.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    doc = {
        "user_id": user_id,
        "counsellor_id": payload.counsellor_id,
        "counsellor_name": counsellor.get("name"),
        "counsellor_title": counsellor.get("title"),
        "support_type": payload.support_type,
        "preferred_date": payload.preferred_date,
        "time_slot": payload.time_slot,
        "student_notes": payload.student_notes.strip() if payload.student_notes else None,
        "status": "pending",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    res = await app_col.insert_one(doc)
    doc["id"] = str(res.inserted_id)

    first = current_user["name"].split(" ")[0]
    await send_email(
        current_user["email"],
        "We've received your counselling request",
        f"Hi {first},\n\nYour request with {counsellor.get('name')} for {payload.preferred_date} at {payload.time_slot} "
        "is waiting for the counsellor to confirm. We'll email you as soon as they respond.",
        render_html("Request received",
                    f"<p>Hi {first}, your request with <b>{counsellor.get('name')}</b> on <b>{payload.preferred_date}</b> at "
                    f"<b>{payload.time_slot}</b> is waiting for confirmation. We'll email you when they respond.</p>"),
    )
    c_email = await _counsellor_email(payload.counsellor_id)
    if c_email:
        await send_email(
            c_email, "New counselling request on Serenova",
            f"A student has requested {payload.preferred_date} at {payload.time_slot}. Sign in to confirm, decline or suggest another time.",
        )
    return doc


@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = db_manager.get_collection("appointments").find({"user_id": user_id}).sort("preferred_date", -1)
    docs = await cursor.to_list(length=50)
    counsellors = {c["_id"]: c for c in await db_manager.get_collection("counsellors").find({}).to_list(length=100)}
    return [_with_link(d, counsellors.get(d.get("counsellor_id"))) for d in docs]


@router.get("/{id}", response_model=AppointmentResponse)
async def get_appointment(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = await db_manager.get_collection("appointments").find_one({"_id": id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
    counsellor = await db_manager.get_collection("counsellors").find_one({"_id": doc.get("counsellor_id")})
    return _with_link(doc, counsellor)


@router.patch("/{id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    app_col = db_manager.get_collection("appointments")
    doc = await app_col.find_one({"_id": id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
    if doc.get("status") in ("completed", "declined"):
        raise HTTPException(status_code=409, detail="This appointment can no longer be cancelled.")

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await app_col.update_one({"_id": id, "user_id": user_id}, {"$set": {"status": "cancelled", "updated_at": now_iso}})
    updated = await app_col.find_one({"_id": id, "user_id": user_id})
    return _with_link(updated)

# Note: students can no longer set an appointment's status themselves (that let anyone "confirm" their own booking).
# Confirming, declining and completing is done by the counsellor in /api/counsellor/appointments.
