import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.models import AssessmentSubmit, AssessmentResponse
from app.auth import get_current_user
from app.database import db_manager
from app.services.crisis_log import log_crisis_event

router = APIRouter(prefix="/api/assessments", tags=["Self-Assessment"])

# ─────────────────────────────────────────────────────────────────────────────
# Instruments
#
#  1. PHQ-9  (Patient Health Questionnaire-9)  — depression screening, 0-27
#  2. GAD-7  (Generalized Anxiety Disorder-7)  — anxiety screening,     0-21
#  3. Student stress check (Serenova)          — 4 items about academic /
#     campus life, 0-12. NOT a validated clinical scale; shown as context only.
#
# PHQ-9 and GAD-7 were developed by Drs. Spitzer, Williams, Kroenke and
# colleagues with an educational grant from Pfizer Inc. No permission is
# required to reproduce, translate, display or distribute them.
# Both use the same response scale: 0 Not at all, 1 Several days,
# 2 More than half the days, 3 Nearly every day.
# ─────────────────────────────────────────────────────────────────────────────

PHQ9_ID = "phq9"
GAD7_ID = "gad7"
STRESS_ID = "stress"

SECTIONS: List[Dict[str, Any]] = [
    {
        "id": PHQ9_ID,
        "title": "Mood & energy",
        "instrument": "PHQ-9",
        "intro": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
        "validated": True,
        "max": 27,
    },
    {
        "id": GAD7_ID,
        "title": "Worry & anxiety",
        "instrument": "GAD-7",
        "intro": "Over the last 2 weeks, how often have you been bothered by the following problems?",
        "validated": True,
        "max": 21,
    },
    {
        "id": STRESS_ID,
        "title": "Student life",
        "instrument": "Serenova student check-in",
        "intro": "A few questions about campus and academic life. These add context but are not a clinical scale.",
        "validated": False,
        "max": 12,
    },
]

QUESTIONS: List[Dict[str, Any]] = [
    # ── PHQ-9 ────────────────────────────────────────────────────
    {"id": 1, "section": PHQ9_ID, "prompt": "Little interest or pleasure in doing things"},
    {"id": 2, "section": PHQ9_ID, "prompt": "Feeling down, depressed, or hopeless"},
    {"id": 3, "section": PHQ9_ID, "prompt": "Trouble falling or staying asleep, or sleeping too much"},
    {"id": 4, "section": PHQ9_ID, "prompt": "Feeling tired or having little energy"},
    {"id": 5, "section": PHQ9_ID, "prompt": "Poor appetite or overeating"},
    {"id": 6, "section": PHQ9_ID, "prompt": "Feeling bad about yourself, or that you are a failure or have let yourself or your family down"},
    {"id": 7, "section": PHQ9_ID, "prompt": "Trouble concentrating on things, such as reading the newspaper or watching television"},
    {"id": 8, "section": PHQ9_ID, "prompt": "Moving or speaking so slowly that other people could have noticed? Or the opposite: being so fidgety or restless that you have been moving around a lot more than usual"},
    {"id": 9, "section": PHQ9_ID, "prompt": "Thoughts that you would be better off dead, or of hurting yourself in some way", "safety": True},
    # ── GAD-7 ────────────────────────────────────────────────────
    {"id": 10, "section": GAD7_ID, "prompt": "Feeling nervous, anxious or on edge"},
    {"id": 11, "section": GAD7_ID, "prompt": "Not being able to stop or control worrying"},
    {"id": 12, "section": GAD7_ID, "prompt": "Worrying too much about different things"},
    {"id": 13, "section": GAD7_ID, "prompt": "Trouble relaxing"},
    {"id": 14, "section": GAD7_ID, "prompt": "Being so restless that it is hard to sit still"},
    {"id": 15, "section": GAD7_ID, "prompt": "Becoming easily annoyed or irritable"},
    {"id": 16, "section": GAD7_ID, "prompt": "Feeling afraid, as if something awful might happen"},
    # ── Student life ─────────────────────────────────────────────
    {"id": 17, "section": STRESS_ID, "prompt": "Feeling overwhelmed by deadlines, exams or the amount of coursework"},
    {"id": 18, "section": STRESS_ID, "prompt": "Feeling that you do not belong, or are falling behind your peers"},
    {"id": 19, "section": STRESS_ID, "prompt": "Pulling back from friends, family or campus activities"},
    {"id": 20, "section": STRESS_ID, "prompt": "Worrying about money, placements, or what comes after graduation"},
]

QUESTION_IDS = {q["id"] for q in QUESTIONS}
SECTION_OF = {q["id"]: q["section"] for q in QUESTIONS}
MAX_TOTAL = sum(s["max"] for s in SECTIONS)  # 60

DISCLAIMER_TEXT = (
    "This screening is for general self-reflection and well-being awareness. It uses the "
    "PHQ-9 and GAD-7 screening questionnaires, but it is not a clinical diagnosis and does not "
    "replace a consultation with a qualified healthcare professional."
)

SCALE = [
    {"score": 0, "label": "Not at all"},
    {"score": 1, "label": "Several days"},
    {"score": 2, "label": "More than half the days"},
    {"score": 3, "label": "Nearly every day"},
]

# Severity rank is used to pick the overall category (worst of the two scales).
CATEGORIES = ["minimal", "mild", "moderate", "elevated"]


def phq9_band(score: int) -> Dict[str, Any]:
    """Standard PHQ-9 cut-points: 0-4, 5-9, 10-14, 15-19, 20-27."""
    if score <= 4:
        return {"label": "Minimal", "rank": 0}
    if score <= 9:
        return {"label": "Mild", "rank": 1}
    if score <= 14:
        return {"label": "Moderate", "rank": 2}
    if score <= 19:
        return {"label": "Moderately severe", "rank": 3}
    return {"label": "Severe", "rank": 3}


def gad7_band(score: int) -> Dict[str, Any]:
    """Standard GAD-7 cut-points: 0-4, 5-9, 10-14, 15-21."""
    if score <= 4:
        return {"label": "Minimal", "rank": 0}
    if score <= 9:
        return {"label": "Mild", "rank": 1}
    if score <= 14:
        return {"label": "Moderate", "rank": 2}
    return {"label": "Severe", "rank": 3}


def stress_band(score: int) -> Dict[str, Any]:
    """Serenova student check-in (0-12). Not a validated scale."""
    if score <= 3:
        return {"label": "Low", "rank": 0}
    if score <= 6:
        return {"label": "Some strain", "rank": 1}
    if score <= 9:
        return {"label": "High strain", "rank": 2}
    return {"label": "Very high strain", "rank": 3}


BANDS = {PHQ9_ID: phq9_band, GAD7_ID: gad7_band, STRESS_ID: stress_band}

OVERALL = {
    "minimal": {
        "label": "Minimal Concern / Healthy Balance",
        "interpretation": (
            "Your answers suggest few symptoms of low mood or anxiety right now. You appear to be "
            "coping well with daily and academic demands."
        ),
        "recommendations": [
            "Keep up the routines that are working: regular sleep, meals, movement and time with people you like.",
            "Use the mood tracker to notice what lifts you, so you can repeat it during busy weeks.",
            "Re-take this screening every few weeks, or any time things start to feel different.",
        ],
    },
    "mild": {
        "label": "Mild Concern / Early Strain",
        "interpretation": (
            "You are showing some symptoms of low mood or anxiety. This is common during demanding "
            "semesters and is a good moment to look after yourself before it builds."
        ),
        "recommendations": [
            "Protect your sleep: a fixed wake-up time and no screens 30 minutes before bed help more than most people expect.",
            "Break big tasks into 20-minute blocks and take short walks between them.",
            "Try a breathing or grounding exercise with the Serenova companion.",
            "Talk to a friend or family member about how the week has been.",
        ],
    },
    "moderate": {
        "label": "Moderate Concern / Notable Strain",
        "interpretation": (
            "Your answers point to symptoms that are likely affecting your days: concentration, energy, "
            "sleep or worry. Talking to a professional is a sensible next step at this level."
        ),
        "recommendations": [
            "Book a confidential session with a campus or Serenova counsellor in the next week or two.",
            "Tell one person you trust how you have been feeling.",
            "Reduce non-essential commitments where you can, and ask faculty for flexibility if coursework feels unmanageable.",
            "Keep logging your mood so a counsellor can see how things have changed.",
        ],
    },
    "elevated": {
        "label": "Elevated Concern / High Distress",
        "interpretation": (
            "Your answers suggest significant distress. This does not mean something is wrong with you; "
            "it means you are carrying a lot and deserve support from a trained person soon."
        ),
        "recommendations": [
            "Please book an appointment with a counsellor or doctor this week. These scores are worth a professional conversation.",
            "If you need to talk to someone right now, call Tele-MANAS (14416, free, 24x7) or iCall (9152987821).",
            "Let someone you trust know how you are doing so you are not holding this alone.",
            "Give yourself permission to pause non-essential deadlines today.",
        ],
    },
}

SAFETY_NOTE = (
    "You indicated that you have had thoughts of being better off dead or of hurting yourself. "
    "Thank you for being honest. Please talk to someone today: call Tele-MANAS on 14416 (free, 24x7), "
    "KIRAN on 1800-599-0019, or 112 if you are in immediate danger."
)


def score_answers(answers: Dict[int, int]) -> Dict[str, Any]:
    """Pure scoring function so it can be unit-tested without the API."""
    sections_out = []
    worst_rank = 0
    total = 0
    for sec in SECTIONS:
        sec_score = sum(score for qid, score in answers.items() if SECTION_OF[qid] == sec["id"])
        band = BANDS[sec["id"]](sec_score)
        total += sec_score
        # Overall category comes from the validated scales (PHQ-9 / GAD-7).
        if sec["validated"]:
            worst_rank = max(worst_rank, band["rank"])
        sections_out.append({
            "id": sec["id"],
            "title": sec["title"],
            "instrument": sec["instrument"],
            "validated": sec["validated"],
            "score": sec_score,
            "max": sec["max"],
            "severity": band["label"],
            "rank": band["rank"],
        })

    # Very high student strain nudges the overall category up by one level
    # (capped at "elevated"); it never lowers it.
    stress = next(s for s in sections_out if s["id"] == STRESS_ID)
    if stress["rank"] == 3:
        worst_rank = min(3, worst_rank + 1)

    category = CATEGORIES[worst_rank]
    safety_flag = answers.get(9, 0) > 0
    return {
        "total_score": total,
        "max_score": MAX_TOTAL,
        "category": category,
        "sections": sections_out,
        "safety_flag": safety_flag,
    }


@router.get("/questions")
async def get_questions():
    return {
        "disclaimer": DISCLAIMER_TEXT,
        "period": "Over the last 2 weeks",
        "scale": SCALE,
        "sections": SECTIONS,
        "questions": QUESTIONS,
    }


@router.post("", response_model=AssessmentResponse)
async def submit_assessment(payload: AssessmentSubmit, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])

    answers: Dict[int, int] = {}
    for item in payload.answers:
        if item.question_id not in QUESTION_IDS:
            raise HTTPException(status_code=422, detail=f"Unknown question id {item.question_id}")
        if item.question_id in answers:
            raise HTTPException(status_code=422, detail=f"Duplicate answer for question {item.question_id}")
        answers[item.question_id] = item.score

    missing = sorted(QUESTION_IDS - set(answers))
    if missing:
        raise HTTPException(status_code=422, detail=f"Please answer every question. Missing: {missing}")

    result = score_answers(answers)
    info = OVERALL[result["category"]]

    interpretation = info["interpretation"]
    recommendations = list(info["recommendations"])
    if result["safety_flag"]:
        interpretation = f"{SAFETY_NOTE}\n\n{interpretation}"
        recommendations.insert(0, "Please speak to someone today: Tele-MANAS 14416 (free, 24x7).")

    doc = {
        "user_id": user_id,
        "total_score": result["total_score"],
        "max_score": result["max_score"],
        "category": result["category"],
        "level_label": info["label"],
        "interpretation": interpretation,
        "recommendations": recommendations,
        "sections": result["sections"],
        "safety_flag": result["safety_flag"],
        # Per-scale scores (also kept as flat fields so older screens and exports keep working)
        "score_schema_version": 2,
        "phq9_score": next((x["score"] for x in result["sections"] if x["id"] == PHQ9_ID), None),
        "gad7_score": next((x["score"] for x in result["sections"] if x["instrument"] == "GAD-7"), None),
        "safety_item_score": next((a.score for a in payload.answers if a.question_id == 9), 0),
        "disclaimer": DISCLAIMER_TEXT,
        "answers": [a.model_dump() for a in payload.answers],
        "taken_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    col = db_manager.get_collection("assessments")
    res = await col.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    if result["safety_flag"]:
        await log_crisis_event(user_id, "assessment", doc["id"])
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
