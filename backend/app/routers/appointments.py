import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import AppointmentCreate, AppointmentStatusUpdate, AppointmentResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/appointments", tags=["Counselling Appointments"])

@router.post("", response_model=AppointmentResponse)
async def book_appointment(payload: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    counsellors_col = db_manager.get_collection("counsellors")
    
    counsellor = await counsellors_col.find_one({"_id": payload.counsellor_id})
    if not counsellor:
        raise HTTPException(status_code=404, detail="Selected counsellor does not exist")
        
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
        "updated_at": now_iso
    }
    
    app_col = db_manager.get_collection("appointments")
    res = await app_col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc

@router.get("", response_model=List[AppointmentResponse])
async def list_appointments(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    app_col = db_manager.get_collection("appointments")
    
    cursor = app_col.find({"user_id": user_id}).sort("preferred_date", -1)
    docs = await cursor.to_list(length=50)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        results.append(d)
    return results

@router.get("/{id}", response_model=AppointmentResponse)
async def get_appointment(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    app_col = db_manager.get_collection("appointments")
    
    doc = await app_col.find_one({"_id": id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    doc["id"] = str(doc["_id"])
    return doc

@router.patch("/{id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    app_col = db_manager.get_collection("appointments")
    
    doc = await app_col.find_one({"_id": id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await app_col.update_one(
        {"_id": id, "user_id": user_id},
        {"$set": {"status": "cancelled", "updated_at": now_iso}}
    )
    
    updated = await app_col.find_one({"_id": id, "user_id": user_id})
    updated["id"] = str(updated["_id"])
    return updated

@router.patch("/{id}/status", response_model=AppointmentResponse)
async def update_status(id: str, payload: AppointmentStatusUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    app_col = db_manager.get_collection("appointments")
    
    doc = await app_col.find_one({"_id": id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    await app_col.update_one(
        {"_id": id, "user_id": user_id},
        {"$set": {"status": payload.status, "updated_at": now_iso}}
    )
    
    updated = await app_col.find_one({"_id": id, "user_id": user_id})
    updated["id"] = str(updated["_id"])
    return updated
