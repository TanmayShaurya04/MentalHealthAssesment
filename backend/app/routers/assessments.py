import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.models import AssessmentSubmit, AssessmentResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/assessments", tags=["Self-Assessment"])

QUESTIONS = [
    {"id": 1, "prompt": "Feeling overwhelmed by university deadlines or academic expectations?"},
    {"id": 2, "prompt": "Trouble falling asleep, staying asleep, or sleeping significantly more than usual?"},
    {"id": 3, "prompt": "Feeling low on physical or mental energy, even after a full night's rest?"},
    {"id": 4, "prompt": "Difficulty concentrating on lectures, coursework, or reading materials?"},
    {"id": 5, "prompt": "Feeling restless, tense, or unable to sit quietly and relax?"},
    {"id": 6, "prompt": "Feeling isolated, lonely, or disconnected from friends and peers?"},
    {"id": 7, "prompt": "Little interest or pleasure in hobbies and activities you usually enjoy?"},
    {"id": 8, "prompt": "Feeling like you're falling behind others or experiencing imposter syndrome?"},
    {"id": 9, "prompt": "Physical symptoms of stress, such as racing heart, headaches, or tight chest?"},
    {"id": 10, "prompt": "Feeling emotionally stretched or having a hard time balancing daily demands?"},
]

DISCLAIMER_TEXT = "This screening is for general self-reflection and well-being awareness. It is not a medical diagnosis and does not replace a clinical consultation."

@router.get("/questions")
async def get_questions():
    return {
        "disclaimer": DISCLAIMER_TEXT,
        "scale": [
            {"score": 0, "label": "Rarely / Never"},
            {"score": 1, "label": "Several days"},
            {"score": 2, "label": "More than half the days"},
            {"score": 3, "label": "Nearly every day"}
        ],
        "questions": QUESTIONS
    }

@router.post("", response_model=AssessmentResponse)
async def submit_assessment(payload: AssessmentSubmit, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    total_score = sum(item.score for item in payload.answers)
    
    if total_score <= 7:
        category = "minimal"
        label = "Minimal Concern"
        interp = (
            "Your responses indicate that you are experiencing manageable emotional demands typical of university life. "
            "Continuing your existing healthy habits, regular sleep, and social connections can help sustain your well-being."
        )
        recs = [
            "Maintain your current sleep and physical activity routines.",
            "Schedule short intentional study breaks using the Pomodoro technique.",
            "Keep an occasional reflection in your private journal."
        ]
    elif total_score <= 14:
        category = "mild"
        label = "Mild Concern"
        interp = (
            "You are showing signs of mild academic stress or occasional emotional fatigue. "
            "This is common during semesters with heavy workloads, but it's an important moment to slow down before it grows into deeper exhaustion."
        )
        recs = [
            "Check in on your sleep consistency and limit screens 30 minutes before bed.",
            "Use the Serenova AI companion or private journal to unpack what feels heaviest.",
            "Review our study stress and task triage well-being resources."
        ]
    elif total_score <= 21:
        category = "moderate"
        label = "Moderate Concern"
        interp = (
            "Your responses suggest a noticeable degree of emotional strain and pressure. "
            "Academic demands or personal concerns may be wearing down your energy reserves and focus."
        )
        recs = [
            "Consider scheduling a confidential conversation with a university counsellor.",
            "Break your academic obligations down into single, low-stakes micro-tasks.",
            "Talk to a trusted friend, family member, or faculty advisor about your current workload."
        ]
    else:
        category = "elevated"
        label = "Elevated Concern"
        interp = (
            "You are carrying significant distress right now. Please know that having a difficult season does not mean you are failing. "
            "Reaching out for human support is one of the strongest, most compassionate steps you can take for yourself."
        )
        recs = [
            "We strongly encourage booking an appointment with a campus counsellor.",
            "If you feel in crisis or urgent need of support, connect with Tele-MANAS (14416) or iCall (9152987821) immediately.",
            "Give yourself permission to pause non-essential commitments today."
        ]
        
    doc = {
        "user_id": user_id,
        "total_score": total_score,
        "category": category,
        "level_label": label,
        "interpretation": interp,
        "recommendations": recs,
        "disclaimer": DISCLAIMER_TEXT,
        "answers": [a.model_dump() for a in payload.answers],
        "taken_at": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
    
    col = db_manager.get_collection("assessments")
    res = await col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    return doc

@router.get("", response_model=List[AssessmentResponse])
async def list_assessments(limit: int = 10, current_user: dict = Depends(get_current_user)):
    col = db_manager.get_collection("assessments")
    user_id = str(current_user["_id"])
    
    cursor = col.find({"user_id": user_id}).sort("taken_at", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    
    results = []
    for d in docs:
        d["id"] = str(d["_id"])
        results.append(d)
    return results

@router.get("/latest")
async def get_latest_assessment(current_user: dict = Depends(get_current_user)):
    col = db_manager.get_collection("assessments")
    user_id = str(current_user["_id"])
    
    cursor = col.find({"user_id": user_id}).sort("taken_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    if not docs:
        return {"latest": None}
    latest = docs[0]
    latest["id"] = str(latest["_id"])
    return {"latest": latest}
