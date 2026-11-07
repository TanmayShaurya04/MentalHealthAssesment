import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.models import AssessmentSubmit, AssessmentResponse
from app.auth import get_current_user
from app.database import db_manager

router = APIRouter(prefix="/api/assessments", tags=["Self-Assessment"])

QUESTIONS = [
    {"id": 1, "section": "PHQ-9", "prompt": "Little interest or pleasure in doing things?", "domain": "Mood"},
    {"id": 2, "section": "PHQ-9", "prompt": "Feeling down, depressed, or hopeless?", "domain": "Mood"},
    {"id": 3, "section": "PHQ-9", "prompt": "Trouble falling or staying asleep, or sleeping too much?", "domain": "Sleep"},
    {"id": 4, "section": "PHQ-9", "prompt": "Feeling tired or having little energy?", "domain": "Energy"},
    {"id": 5, "section": "PHQ-9", "prompt": "Poor appetite or overeating?", "domain": "Appetite"},
    {"id": 6, "section": "PHQ-9", "prompt": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down?", "domain": "Self-worth"},
    {"id": 7, "section": "PHQ-9", "prompt": "Trouble concentrating on things, such as reading the newspaper or watching television?", "domain": "Concentration"},
    {"id": 8, "section": "PHQ-9", "prompt": "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?", "domain": "Movement"},
    {"id": 9, "section": "PHQ-9", "prompt": "Thoughts that you would be better off dead, or of hurting yourself in some way?", "domain": "Safety", "safety_item": True},
    {"id": 10, "section": "GAD-7", "prompt": "Feeling nervous, anxious, or on edge?", "domain": "Anxiety"},
    {"id": 11, "section": "GAD-7", "prompt": "Not being able to stop or control worrying?", "domain": "Worry"},
    {"id": 12, "section": "GAD-7", "prompt": "Worrying too much about different things?", "domain": "Worry"},
    {"id": 13, "section": "GAD-7", "prompt": "Trouble relaxing?", "domain": "Tension"},
    {"id": 14, "section": "GAD-7", "prompt": "Being so restless that it is hard to sit still?", "domain": "Restlessness"},
    {"id": 15, "section": "GAD-7", "prompt": "Becoming easily annoyed or irritable?", "domain": "Irritability"},
    {"id": 16, "section": "GAD-7", "prompt": "Feeling afraid as if something awful might happen?", "domain": "Fear"},
    {"id": 17, "section": "Student-life check-in", "prompt": "How often have academic or campus responsibilities felt hard to manage?", "domain": "Student life", "context_only": True},
    {"id": 18, "section": "Student-life check-in", "prompt": "How often have you felt connected to someone you can turn to for support?", "domain": "Support", "context_only": True, "reverse_context": True},
    {"id": 19, "section": "Student-life check-in", "prompt": "How often have you had enough time to rest between your responsibilities?", "domain": "Rest", "context_only": True, "reverse_context": True},
    {"id": 20, "section": "Student-life check-in", "prompt": "How often have you felt able to take one small step when something felt difficult?", "domain": "Coping", "context_only": True, "reverse_context": True},
]

DISCLAIMER_TEXT = "This screening is for general self-reflection and well-being awareness. It is not a clinical medical diagnosis and does not replace a consultation with a certified healthcare professional."

@router.get("/questions")
async def get_questions():
    return {
        "disclaimer": DISCLAIMER_TEXT,
        "period": "Over the past 2 weeks",
        "sections": [
            {"name": "PHQ-9", "description": "9-item low-mood screening"},
            {"name": "GAD-7", "description": "7-item anxiety screening"},
            {"name": "Student-life check-in", "description": "4 Serenova context questions; not a clinical scale"}
        ],
        "scale": [
            {"score": 0, "label": "Not at all"},
            {"score": 1, "label": "Several days"},
            {"score": 2, "label": "More than half the days"},
            {"score": 3, "label": "Nearly every day"}
        ],
        "questions": QUESTIONS
    }

@router.post("", response_model=AssessmentResponse)
async def submit_assessment(payload: AssessmentSubmit, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    answer_map = {item.question_id: item.score for item in payload.answers}
    expected_ids = set(range(1, 21))
    if len(answer_map) != 20 or set(answer_map) != expected_ids:
        raise HTTPException(status_code=422, detail="Please answer each of the 20 questions once.")

    phq9_score = sum(answer_map[i] for i in range(1, 10))
    gad7_score = sum(answer_map[i] for i in range(10, 17))
    total_score = phq9_score + gad7_score
    phq_band = "minimal" if phq9_score < 5 else "mild" if phq9_score < 10 else "moderate" if phq9_score < 15 else "elevated"
    gad_band = "minimal" if gad7_score < 5 else "mild" if gad7_score < 10 else "moderate" if gad7_score < 15 else "elevated"
    priority = {"minimal": 0, "mild": 1, "moderate": 2, "elevated": 3}
    category = max((phq_band, gad_band), key=lambda band: priority[band])
    labels = {"minimal": "Lower screening range", "mild": "Some symptoms reported", "moderate": "More frequent symptoms reported", "elevated": "Frequent symptoms reported"}
    label = labels[category]
    interp = (
        "These self-reported answers are a screening snapshot for the past two weeks. They cannot diagnose a condition. "
        "Your separate PHQ-9 and GAD-7 scores can help you decide whether to talk with a qualified health professional, who can understand your wider circumstances."
    )
    recs = [
        "If these experiences are affecting your studies, relationships, sleep, or daily life, consider speaking with a qualified counsellor or healthcare professional.",
        "Your student-life answers are context for reflection only; they are not included in the PHQ-9 or GAD-7 scores.",
        "You can use the private journal, mood check-in, or campus support directory to note what kind of help would feel useful."
    ]
    safety_item_score = answer_map[9]
    if safety_item_score > 0:
        recs.insert(0, "You reported thoughts of being better off dead or self-harm. If you may act on these thoughts or are in immediate danger, call India emergency services at 112 or Tele-MANAS at 14416 now, and reach out to someone you trust who can stay with you. A screening result cannot assess immediate safety.")
        
    doc = {
        "user_id": user_id,
        "total_score": total_score,
        "score_schema_version": 2,
        "phq9_score": phq9_score,
        "gad7_score": gad7_score,
        "student_life_answers": [{"question_id": i, "score": answer_map[i]} for i in range(17, 21)],
        "safety_item_score": safety_item_score,
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
