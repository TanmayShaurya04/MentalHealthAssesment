import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from app.models import JournalCreate, JournalUpdate, JournalResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/journals", tags=["Private Journal"])

@router.post("", response_model=JournalResponse)
async def create_journal(payload: JournalCreate, current_user: dict = Depends(get_current_user)):
    journals_col = db_manager.get_collection("journals")
    user_id = str(current_user["_id"])
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    doc = {
        "user_id": user_id,
        "title": payload.title.strip(),
        "content": payload.content.strip(),
        "mood_level": payload.mood_level,
        "tags": [t.strip() for t in (payload.tags or []) if t.strip()],
        "created_at": now_iso,
        "updated_at": now_iso
    }
    
    res = await journals_col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc

@router.get("", response_model=List[JournalResponse])
async def list_journals(limit: int = 50, tag: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    journals_col = db_manager.get_collection("journals")
    user_id = str(current_user["_id"])
    
    query = {"user_id": user_id}
    if tag:
        query["tags"] = {"$in": [tag]}
        
    cursor = journals_col.find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        results.append(d)
    return results

@router.get("/{id}", response_model=JournalResponse)
async def get_journal(id: str, current_user: dict = Depends(get_current_user)):
    journals_col = db_manager.get_collection("journals")
    user_id = str(current_user["_id"])
    
    entry = await journals_col.find_one({"_id": id, "user_id": user_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
        
    entry["id"] = str(entry["_id"])
    return entry

@router.patch("/{id}", response_model=JournalResponse)
async def update_journal(id: str, payload: JournalUpdate, current_user: dict = Depends(get_current_user)):
    journals_col = db_manager.get_collection("journals")
    user_id = str(current_user["_id"])
    
    entry = await journals_col.find_one({"_id": id, "user_id": user_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
        
    update_data = {"updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    if payload.title is not None:
        update_data["title"] = payload.title.strip()
    if payload.content is not None:
        update_data["content"] = payload.content.strip()
    if payload.mood_level is not None:
        update_data["mood_level"] = payload.mood_level
    if payload.tags is not None:
        update_data["tags"] = [t.strip() for t in payload.tags if t.strip()]
        
    await journals_col.update_one({"_id": id, "user_id": user_id}, {"$set": update_data})
    
    updated = await journals_col.find_one({"_id": id, "user_id": user_id})
    updated["id"] = str(updated["_id"])
    return updated

@router.delete("/{id}")
async def delete_journal(id: str, current_user: dict = Depends(get_current_user)):
    journals_col = db_manager.get_collection("journals")
    user_id = str(current_user["_id"])
    
    entry = await journals_col.find_one({"_id": id, "user_id": user_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
        
    await journals_col.delete_one({"_id": id, "user_id": user_id})
    return {"message": "Journal entry deleted successfully"}
