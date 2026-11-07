"""Endpoints for signed-in counsellors: manage their own requests, notes and availability."""
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from app.models import CounsellorAppointmentUpdate, SessionNote, AvailabilityUpdate
from app.auth import require_roles
from app.database import db_manager
from app.services.email_service import send_email, render_html
from app.services.appointment_rules import validate_slot, WEEKDAYS

router = APIRouter(prefix="/api/counsellor", tags=["Counsellor Portal"])
counsellor_only = require_roles("counsellor")

ACTIVE = ("pending", "confirmed")


async def _my_counsellor(user: dict) -> dict:
    cid = user.get("counsellor_id")
    c = await db_manager.get_collection("counsellors").find_one({"_id": cid}) if cid else None
    if not c:
        raise HTTPException(status_code=404, detail="Your account isn't linked to a counsellor profile yet. Ask an administrator.")
    return c


async def _own_appointment(user: dict, appt_id: str) -> dict:
    doc = await db_manager.get_collection("appointments").find_one({"_id": appt_id})
    if not doc or doc.get("counsellor_id") != user.get("counsellor_id"):
        raise HTTPException(status_code=404, detail="Appointment not found")
    return doc


def _view(doc: dict, student: Optional[dict]) -> dict:
    """What a counsellor may see: the student's first name and what they chose to write. No email, no other records."""
    return {
        "id": str(doc["_id"]),
        "student_name": (student or {}).get("name", "Student"),
        "student_university": ((student or {}).get("profile") or {}).get("university", ""),
        "support_type": doc.get("support_type"),
        "preferred_date": doc.get("preferred_date"),
        "time_slot": doc.get("time_slot"),
        "student_notes": doc.get("student_notes"),
        "status": doc.get("status"),
        "counsellor_note": doc.get("counsellor_note", ""),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@router.get("/summary")
async def summary(user: dict = Depends(counsellor_only)):
    c = await _my_counsellor(user)
    appts = await db_manager.get_collection("appointments").find({"counsellor_id": c["_id"]}).to_list(length=2000)
    today = datetime.date.today().isoformat()
    return {
        "counsellor": {"id": c["_id"], "name": c["name"], "title": c.get("title")},
        "pending": sum(1 for a in appts if a.get("status") == "pending"),
        "upcoming": sum(1 for a in appts if a.get("status") == "confirmed" and a.get("preferred_date", "") >= today),
        "completed": sum(1 for a in appts if a.get("status") == "completed"),
        "total": len(appts),
    }


@router.get("/appointments")
async def list_requests(status: Optional[str] = None, user: dict = Depends(counsellor_only)):
    c = await _my_counsellor(user)
    docs = await db_manager.get_collection("appointments").find({"counsellor_id": c["_id"]}).to_list(length=2000)
    if status:
        docs = [d for d in docs if d.get("status") == status]
    docs.sort(key=lambda d: (d.get("preferred_date", ""), d.get("time_slot", "")))
    users = {u["_id"]: u for u in await db_manager.get_collection("users").find({}).to_list(length=100000)}
    return [_view(d, users.get(d.get("user_id"))) for d in docs]


@router.patch("/appointments/{appt_id}")
async def update_request(appt_id: str, payload: CounsellorAppointmentUpdate, user: dict = Depends(counsellor_only)):
    c = await _my_counsellor(user)
    doc = await _own_appointment(user, appt_id)
    app_col = db_manager.get_collection("appointments")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    changes = {"updated_at": now_iso}
    if payload.message is not None:
        changes["counsellor_message"] = payload.message.strip() or None

    rescheduled = False
    if payload.preferred_date or payload.time_slot:
        new_date = payload.preferred_date or doc["preferred_date"]
        new_slot = payload.time_slot or doc["time_slot"]
        validate_slot(c, new_date, new_slot)
        clash = [
            a for a in await app_col.find({"counsellor_id": c["_id"], "preferred_date": new_date, "time_slot": new_slot}).to_list(length=50)
            if a.get("status") in ACTIVE and str(a["_id"]) != appt_id
        ]
        if clash:
            raise HTTPException(status_code=409, detail="You already have a booking in that slot.")
        changes.update({"preferred_date": new_date, "time_slot": new_slot, "status": "confirmed", "reminded": False})
        rescheduled = True

    if payload.status:
        if doc.get("status") in ("cancelled",):
            raise HTTPException(status_code=409, detail="The student has cancelled this request.")
        if payload.status == "completed" and doc.get("status") != "confirmed":
            raise HTTPException(status_code=409, detail="Only a confirmed session can be marked completed.")
        changes["status"] = payload.status
        if payload.status == "confirmed":
            changes["reminded"] = False

    await app_col.update_one({"_id": appt_id}, {"$set": changes})
    updated = await app_col.find_one({"_id": appt_id})

    # Tell the student what happened
    student = await db_manager.get_collection("users").find_one({"_id": doc["user_id"]})
    if student and (rescheduled or payload.status in ("confirmed", "declined")):
        what = ("has suggested a new time and confirmed it" if rescheduled
                else "has confirmed your session" if payload.status == "confirmed"
                else "can't take this slot")
        extra = f"\n\nMessage from your counsellor: {payload.message}" if payload.message else ""
        link = f"\n\nVideo link: {c.get('video_meet_link')}" if updated.get("status") == "confirmed" else ""
        await send_email(
            student["email"],
            f"Update on your counselling request ({updated['status']})",
            f"Hi {student['name'].split(' ')[0]},\n\n{c['name']} {what}: {updated['preferred_date']} at {updated['time_slot']}.{extra}{link}\n\n"
            "You can see all the details in Serenova under Counsellors → My Appointments.",
            render_html("Your counselling request was updated",
                        f"<p><b>{c['name']}</b> {what}: <b>{updated['preferred_date']}</b> at <b>{updated['time_slot']}</b>.</p>"
                        + (f"<p><i>{payload.message}</i></p>" if payload.message else "")),
        )
    return _view(updated, student)


@router.put("/appointments/{appt_id}/note")
async def save_note(appt_id: str, payload: SessionNote, user: dict = Depends(counsellor_only)):
    """A private note for the counsellor's own records. Students never see it, and it isn't in their data export."""
    await _own_appointment(user, appt_id)
    await db_manager.get_collection("appointments").update_one(
        {"_id": appt_id}, {"$set": {"counsellor_note": payload.note.strip()}}
    )
    return {"message": "Note saved"}


@router.get("/availability")
async def get_availability(user: dict = Depends(counsellor_only)):
    c = await _my_counsellor(user)
    return {
        "available_days": c.get("available_days", []),
        "available_slots": c.get("available_slots", []),
        "is_accepting_students": c.get("is_accepting_students", True),
        "all_days": WEEKDAYS,
    }


@router.put("/availability")
async def set_availability(payload: AvailabilityUpdate, user: dict = Depends(counsellor_only)):
    c = await _my_counsellor(user)
    days = [d for d in WEEKDAYS if d in payload.available_days]
    slots = []
    for s in payload.available_slots:
        s = s.strip()
        try:
            slots.append(datetime.datetime.strptime(s, "%I:%M %p").strftime("%I:%M %p"))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"'{s}' is not a time like 10:30 AM")
    slots = sorted(set(slots), key=lambda t: datetime.datetime.strptime(t, "%I:%M %p"))
    await db_manager.get_collection("counsellors").update_one(
        {"_id": c["_id"]},
        {"$set": {"available_days": days, "available_slots": slots, "is_accepting_students": payload.is_accepting_students}},
    )
    return {"available_days": days, "available_slots": slots, "is_accepting_students": payload.is_accepting_students}
