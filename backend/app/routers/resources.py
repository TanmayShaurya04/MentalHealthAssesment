from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.models import ResourceResponse
from app.database import db_manager

router = APIRouter(prefix="/api/resources", tags=["Curated Resources"])

@router.get("", response_model=List[ResourceResponse])
async def list_resources(category: Optional[str] = None):
    col = db_manager.get_collection("resources")
    query = {}
    if category:
        query["category"] = category
        
    cursor = col.find(query)
    docs = await cursor.to_list(length=50)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        results.append(d)
    return results

@router.get("/{id}", response_model=ResourceResponse)
async def get_resource(id: str):
    col = db_manager.get_collection("resources")
    r = await col.find_one({"_id": id})
    if not r:
        raise HTTPException(status_code=404, detail="Resource not found")
    r["id"] = str(r["_id"])
    return r
