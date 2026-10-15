import datetime
from fastapi import APIRouter, HTTPException, status, Depends
from app.models import UserRegister, UserLogin, UserResponse
from app.database import db_manager
from app.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register")
async def register(payload: UserRegister):
    users_col = db_manager.get_collection("users")
    
    # Check duplicate email (case-insensitive)
    existing = await users_col.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    new_user = {
        "name": payload.name.strip(),
        "email": payload.email.lower().strip(),
        "password_hash": hash_password(payload.password),
        "created_at": now_iso,
        "updated_at": now_iso,
        "profile": {
            "university": payload.university or "",
            "year_of_study": payload.year_of_study or "",
            "avatar_color": "#C65D3A",
        }
    }
    
    res = await users_col.insert_one(new_user)
    user_id = str(res.inserted_id)
    token = create_access_token({"sub": user_id, "email": new_user["email"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": new_user["name"],
            "email": new_user["email"],
            "created_at": new_user["created_at"],
            "profile": new_user["profile"],
        }
    }

@router.post("/login")
async def login(payload: UserLogin):
    users_col = db_manager.get_collection("users")
    user = await users_col.find_one({"email": payload.email.lower().strip()})
    
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "email": user["email"]})
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
            "created_at": user.get("created_at", ""),
            "profile": user.get("profile", {}),
        }
    }

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    # Client invalidates token from sessionStorage
    return {"message": "Logged out successfully"}
