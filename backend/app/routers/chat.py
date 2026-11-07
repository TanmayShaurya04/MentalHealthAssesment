import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.models import ChatSessionCreate, ChatSessionResponse, ChatMessageSend, ChatMessageResponse
from app.auth import get_current_user
from app.database import db_manager
from app.services.safety_layer import check_message_safety
from app.services.ai_service import ai_service

router = APIRouter(prefix="/api/chat", tags=["AI Companion Chat"])

@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(payload: ChatSessionCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    doc = {
        "user_id": user_id,
        "title": payload.title or "New Conversation",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    
    col = db_manager.get_collection("chat_sessions")
    res = await col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc["message_count"] = 0
    return doc

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    sessions_col = db_manager.get_collection("chat_sessions")
    messages_col = db_manager.get_collection("chat_messages")
    
    cursor = sessions_col.find({"user_id": user_id}).sort("updated_at", -1)
    sessions = await cursor.to_list(length=50)
    
    results = []
    for s in sessions:
        s_id = str(s["_id"])
        s["id"] = s_id
        count = await messages_col.count_documents({"session_id": s_id})
        s["message_count"] = count
        results.append(s)
    return results

@router.get("/sessions/{id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    sessions_col = db_manager.get_collection("chat_sessions")
    
    session = await sessions_col.find_one({"_id": id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    messages_col = db_manager.get_collection("chat_messages")
    cursor = messages_col.find({"session_id": id}).sort("timestamp", 1)
    docs = await cursor.to_list(length=100)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        results.append(d)
    return results

@router.post("/sessions/{id}/messages", response_model=ChatMessageResponse)
async def send_message(id: str, payload: ChatMessageSend, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    sessions_col = db_manager.get_collection("chat_sessions")
    messages_col = db_manager.get_collection("chat_messages")
    
    session = await sessions_col.find_one({"_id": id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    content = payload.content.strip()
    
    # 1. Save user message
    user_msg_doc = {
        "session_id": id,
        "user_id": user_id,
        "role": "user",
        "content": content,
        "safety_flagged": False,
        "timestamp": now_iso
    }
    await messages_col.insert_one(user_msg_doc)
    
    # Auto-update session title if it's the first message
    if session.get("title") == "New Conversation":
        auto_title = content[:32] + ("..." if len(content) > 32 else "")
        await sessions_col.update_one({"_id": id}, {"$set": {"title": auto_title}})
        
    # 2. Deterministic Safety Check (Always runs first)
    is_crisis, crisis_reply = check_message_safety(content)
    
    assistant_now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    if is_crisis:
        # Static safe crisis redirect
        asst_msg_doc = {
            "session_id": id,
            "user_id": user_id,
            "role": "assistant",
            "content": crisis_reply,
            "safety_flagged": True,
            "timestamp": assistant_now
        }
        res = await messages_col.insert_one(asst_msg_doc)
        asst_msg_doc["id"] = str(res.inserted_id)
        
        await sessions_col.update_one({"_id": id}, {"$set": {"updated_at": assistant_now}})
        return asst_msg_doc
        
    # 3. Add a small, account-scoped continuity cue from the student's own
    # recent check-ins. Journal text is intentionally never sent to the model.
    personal_context = []
    moods_col = db_manager.get_collection("moods")
    latest_mood_cursor = moods_col.find({"user_id": user_id}).sort("recorded_at", -1).limit(1)
    latest_moods = await latest_mood_cursor.to_list(length=1)
    if latest_moods:
        mood = latest_moods[0]
        mood_label = str(mood.get("level", "")).replace("_", " ")
        allowed_tags = {"Exams", "Deadlines", "Sleep", "Friends", "Family", "Rest", "Exercise", "Burnout"}
        tags = [tag for tag in mood.get("tags", []) if tag in allowed_tags][:4]
        if mood_label:
            personal_context.append(f"Recent mood check-in: {mood_label}" + (f"; themes: {', '.join(tags)}" if tags else ""))

    assessments_col = db_manager.get_collection("assessments")
    latest_assessment_cursor = assessments_col.find({"user_id": user_id}).sort("taken_at", -1).limit(1)
    latest_assessments = await latest_assessment_cursor.to_list(length=1)
    if latest_assessments:
        assessment = latest_assessments[0]
        category = assessment.get("category")
        if category in {"minimal", "mild", "moderate", "elevated"}:
            personal_context.append(f"Most recent optional well-being check-in category: {category}")

    # 4. Call AI Service with recent conversation and optional check-in context
    history_cursor = messages_col.find({"session_id": id}).sort("timestamp", 1).limit(10)
    history_docs = await history_cursor.to_list(length=10)
    
    llm_messages = []
    for d in history_docs:
        llm_messages.append({"role": d["role"], "content": d["content"]})
        
    ai_reply = await ai_service.get_response(llm_messages, personal_context=personal_context)
    
    asst_msg_doc = {
        "session_id": id,
        "user_id": user_id,
        "role": "assistant",
        "content": ai_reply,
        "safety_flagged": False,
        "timestamp": assistant_now
    }
    res = await messages_col.insert_one(asst_msg_doc)
    asst_msg_doc["id"] = str(res.inserted_id)
    
    await sessions_col.update_one({"_id": id}, {"$set": {"updated_at": assistant_now}})
    return asst_msg_doc

@router.delete("/sessions/{id}")
async def delete_session(id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    sessions_col = db_manager.get_collection("chat_sessions")
    messages_col = db_manager.get_collection("chat_messages")
    
    session = await sessions_col.find_one({"_id": id, "user_id": user_id})
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    await sessions_col.delete_one({"_id": id, "user_id": user_id})
    # Remove all messages
    msg_list = await messages_col.find({"session_id": id}).to_list(1000)
    for m in msg_list:
        await messages_col.delete_one({"_id": m["_id"]})
        
    return {"message": "Chat session deleted successfully"}
