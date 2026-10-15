import datetime
from fastapi import APIRouter, Depends, HTTPException
from app.models import UserProfileUpdate, UserResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": str(current_user["_id"]),
        "name": current_user["name"],
        "email": current_user["email"],
        "created_at": current_user.get("created_at", ""),
        "profile": current_user.get("profile", {}),
    }

@router.patch("/me")
async def update_profile(payload: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    users_col = db_manager.get_collection("users")
    user_id = str(current_user["_id"])
    
    update_data = {}
    if payload.name is not None:
        update_data["name"] = payload.name.strip()
    
    current_profile = current_user.get("profile", {})
    if payload.university is not None:
        current_profile["university"] = payload.university.strip()
    if payload.year_of_study is not None:
        current_profile["year_of_study"] = payload.year_of_study.strip()
    if payload.avatar_color is not None:
        current_profile["avatar_color"] = payload.avatar_color
    
    update_data["profile"] = current_profile
    update_data["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    await users_col.update_one({"_id": user_id}, {"$set": update_data})
    
    updated_user = await users_col.find_one({"_id": user_id})
    return {
        "id": user_id,
        "name": updated_user["name"],
        "email": updated_user["email"],
        "created_at": updated_user.get("created_at", ""),
        "profile": updated_user.get("profile", {}),
    }
