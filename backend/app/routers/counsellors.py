import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.models import CounsellorResponse
from app.database import db_manager

router = APIRouter(prefix="/api/counsellors", tags=["Counsellor Module"])

@router.get("", response_model=List[CounsellorResponse])
async def list_counsellors(
    specialty: Optional[str] = None,
    language: Optional[str] = None
):
    col = db_manager.get_collection("counsellors")
    query = {}
    if specialty:
        query["specialties"] = {"$in": [specialty]}
    if language:
        query["languages"] = {"$in": [language]}
        
    cursor = col.find(query)
    docs = await cursor.to_list(length=50)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        d["video_meet_link"] = ""  # shared only with a student whose booking is confirmed
        results.append(d)
    return results

@router.get("/{id}", response_model=CounsellorResponse)
async def get_counsellor(id: str):
    col = db_manager.get_collection("counsellors")
    c = await col.find_one({"_id": id})
    if not c:
        raise HTTPException(status_code=404, detail="Counsellor profile not found")
    c["id"] = str(c["_id"])
    c["video_meet_link"] = ""
    return c


@router.get("/{id}/booked")
async def booked_slots(id: str, days: int = Query(60, ge=1, le=90)):
    """Slots already requested or confirmed, so the calendar can grey them out. Contains no student information."""
    today = datetime.date.today()
    end = today + datetime.timedelta(days=days)
    rows = await db_manager.get_collection("appointments").find({"counsellor_id": id}).to_list(length=1000)
    return [
        {"date": a["preferred_date"], "slot": a["time_slot"]}
        for a in rows
        if a.get("status") in ("pending", "confirmed") and today.isoformat() <= a.get("preferred_date", "") <= end.isoformat()
    ]
