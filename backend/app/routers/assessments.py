import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.models import AssessmentSubmit, AssessmentResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/assessments", tags=["Self-Assessment"])

QUESTIONS = [
    {
        "id": 1,
        "prompt": "Little interest or pleasure in doing things you usually enjoy?",
        "domain": "Anhedonia / Mood"
    },
    {
        "id": 2,
        "prompt": "Feeling down, depressed, emotionally heavy, or hopeless?",
        "domain": "Depressive Symptoms"
    },
    {
        "id": 3,
        "prompt": "Feeling nervous, anxious, on edge, or unable to sit quietly?",
        "domain": "Generalized Anxiety"
    },
    {
        "id": 4,
        "prompt": "Not being able to stop or control persistent worrying thoughts?",
        "domain": "Cognitive Worry"
    },
    {
        "id": 5,
        "prompt": "Trouble falling asleep, staying asleep, or sleeping significantly more than usual?",
        "domain": "Sleep Disturbance"
    },
    {
        "id": 6,
        "prompt": "Feeling tired, drained, or lacking physical and mental energy?",
        "domain": "Fatigue & Energy"
    },
    {
        "id": 7,
        "prompt": "Noticeable changes in appetite (poor appetite or overeating)?",
        "domain": "Somatic Regulation"
    },
    {
        "id": 8,
        "prompt": "Feeling bad about yourself, feeling like a failure, or letting yourself/others down?",
        "domain": "Self-Worth & Esteem"
    },
    {
        "id": 9,
        "prompt": "Trouble concentrating on lectures, reading, assignments, or daily decisions?",
        "domain": "Cognitive Focus"
    },
    {
        "id": 10,
        "prompt": "Feeling easily annoyed, irritable, or frustrated over minor everyday hassles?",
        "domain": "Emotional Reactivity"
    },
    {
        "id": 11,
        "prompt": "Feeling overwhelmed by everyday responsibilities, academic or life demands?",
        "domain": "Stress Overload"
    },
    {
        "id": 12,
        "prompt": "Difficulty relaxing, unwinding, or letting go of tension during free time?",
        "domain": "Tension Regulation"
    },
    {
        "id": 13,
        "prompt": "Withdrawing from friends, family, or social interactions you usually engage in?",
        "domain": "Social Connection"
    },
    {
        "id": 14,
        "prompt": "Physical sensations of stress, such as racing heartbeat, headaches, or tight muscles?",
        "domain": "Somatic Stress"
    },
    {
        "id": 15,
        "prompt": "Feeling pessimistic or uncertain about the future and your ability to overcome challenges?",
        "domain": "Outlook & Resilience"
    },
]

DISCLAIMER_TEXT = "This screening is for general self-reflection and well-being awareness. It is not a clinical medical diagnosis and does not replace a consultation with a certified healthcare professional."

@router.get("/questions")
async def get_questions():
    return {
        "disclaimer": DISCLAIMER_TEXT,
        "period": "Over the past 2 weeks",
        "scale": [
            {"score": 0, "label": "Not at all / Rarely"},
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
    
    # 15 questions, score range: 0 - 45
    if total_score <= 10:
        category = "minimal"
        label = "Minimal Concern / Healthy Balance"
        interp = (
            "Your responses indicate a stable emotional baseline and healthy psychological coping mechanisms. "
            "You appear to be managing daily demands and academic pressures without significant distress."
        )
        recs = [
            "Maintain your current balanced sleep, nutrition, and exercise routines.",
            "Continue taking regular intentional mental breaks during intensive work periods.",
            "Use the Serenova mood tracker to build long-term emotional self-awareness.",
            "Stay engaged with your peer support systems and social hobbies."
        ]
    elif total_score <= 20:
        category = "mild"
        label = "Mild Concern / Early Fatigue"
        interp = (
            "You are showing signs of mild emotional fatigue, occasional anxious worry, or elevated stress. "
            "While common during busy academic seasons, this is a proactive moment to protect your mental energy before burnout sets in."
        )
        recs = [
            "Review your sleep hygiene: limit phone/screen exposure 30 minutes before bed.",
            "Try the 4-4-4-4 Box Breathing exercise with the Serenova AI Companion.",
            "Break looming academic tasks down into 20-minute focused intervals.",
            "Speak with friends, family, or explore campus wellness resources."
        ]
    elif total_score <= 30:
        category = "moderate"
        label = "Moderate Concern / Notable Strain"
        interp = (
            "Your responses reflect notable emotional strain, persistent anxiety, or reduced energy reserves. "
            "Academic obligations or life transitions may be wearing down your capacity to concentrate and unwind."
        )
        recs = [
            "We recommend scheduling a confidential 1-on-1 consultation with a campus counsellor.",
            "Practice saying no to non-essential obligations to protect your rest time.",
            "Utilize the in-app breathing and grounding exercises when feeling overwhelmed.",
            "Connect with faculty advisors or university student support if coursework feels unmanageable."
        ]
    else:
        category = "elevated"
        label = "Elevated Concern / High Distress"
        interp = (
            "You are carrying a significant emotional burden right now. Having a difficult or painful season does not mean you have failed. "
            "Reaching out for professional human support is one of the strongest and most courageous steps you can take for yourself."
        )
        recs = [
            "We strongly encourage booking an appointment or video consultation with one of our certified counsellors.",
            "If you need immediate support, dial Tele-MANAS (14416 - 24x7 Toll-Free) or iCall (9152987821).",
            "Give yourself explicit permission to pause non-essential deadlines today.",
            "Reach out to someone you trust—a friend, family member, or mentor—to share what you are experiencing."
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
