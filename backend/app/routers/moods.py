import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import MoodCreate, MoodResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/moods", tags=["Mood Tracking"])

@router.post("", response_model=MoodResponse)
async def log_mood(payload: MoodCreate, current_user: dict = Depends(get_current_user)):
    moods_col = db_manager.get_collection("moods")
    user_id = str(current_user["_id"])
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    doc = {
        "user_id": user_id,
        "level": payload.level,
        "score": payload.score,
        "note": payload.note.strip() if payload.note else None,
        "tags": payload.tags or [],
        "recorded_at": now_iso
    }
    
    res = await moods_col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc

@router.get("", response_model=List[MoodResponse])
async def list_moods(limit: int = 30, current_user: dict = Depends(get_current_user)):
    moods_col = db_manager.get_collection("moods")
    user_id = str(current_user["_id"])
    
    cursor = moods_col.find({"user_id": user_id}).sort("recorded_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        results.append(d)
    return results

@router.get("/latest")
async def get_latest_mood(current_user: dict = Depends(get_current_user)):
    moods_col = db_manager.get_collection("moods")
    user_id = str(current_user["_id"])
    
    cursor = moods_col.find({"user_id": user_id}).sort("recorded_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    if not docs:
        return {"latest": None}
    latest = docs[0]
    latest["id"] = str(latest["_id"])
    return {"latest": latest}

@router.get("/stats")
async def get_mood_stats(current_user: dict = Depends(get_current_user)):
    moods_col = db_manager.get_collection("moods")
    user_id = str(current_user["_id"])
    
    cursor = moods_col.find({"user_id": user_id}).sort("recorded_at", -1).limit(50)
    docs = await cursor.to_list(length=50)
    
    total = len(docs)
    if total == 0:
        return {
            "total_logs": 0,
            "average_score": 0,
            "distribution": {"very_low": 0, "low": 0, "neutral": 0, "good": 0, "very_good": 0},
            "recent_trend": []
        }
    
    dist = {"very_low": 0, "low": 0, "neutral": 0, "good": 0, "very_good": 0}
    total_score = 0
    trend = []
    
    for d in reversed(docs):
        lvl = d.get("level", "neutral")
        dist[lvl] = dist.get(lvl, 0) + 1
        score = d.get("score", 3)
        total_score += score
        trend.append({
            "recorded_at": d.get("recorded_at"),
            "score": score,
            "level": lvl
        })
        
    return {
        "total_logs": total,
        "average_score": round(total_score / total, 1),
        "distribution": dist,
        "recent_trend": trend[-14:] # last 14 logs for chart
    }

@router.delete("/{id}")
async def delete_mood(id: str, current_user: dict = Depends(get_current_user)):
    moods_col = db_manager.get_collection("moods")
    user_id = str(current_user["_id"])
    
    mood = await moods_col.find_one({"_id": id, "user_id": user_id})
    if not mood:
        raise HTTPException(status_code=404, detail="Mood log not found")
        
    await moods_col.delete_one({"_id": id, "user_id": user_id})
    return {"message": "Mood log deleted successfully"}
