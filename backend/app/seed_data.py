import uuid
import datetime
from typing import List, Dict, Any
import datetime
from app.config import settings
from app.database import db_manager
from app.auth import hash_password

DEFAULT_COUNSELLORS: List[Dict[str, Any]] = [
    {
        "_id": "counsellor-01",
        "name": "Dr. Ananya Sen, Ph.D.",
        "title": "Lead Student Well-Being Psychologist",
        "context": "Academic Burnout, Exam Pressure & Perfectionism",
        "specialties": ["Academic Burnout", "Exam Pressure", "Perfectionism & Overwhelm"],
        "bio": "Over 12 years supporting college students through rigorous academic pressures. Her approach blends Cognitive Behavioral techniques with compassionate pacing.",
        "languages": ["English", "Hindi", "Bengali"],
        "experience_years": 12,
        "fee": 800,
        "video_meet_link": "https://meet.jit.si/serenova-consultation-ananya-sen",
        "avatar": "AS",
        "available_days": ["Mon", "Wed", "Thu", "Fri"],
        "available_slots": ["09:30 AM", "11:00 AM", "02:00 PM", "04:00 PM"],
        "is_accepting_students": True,
    },
    {
        "_id": "counsellor-02",
        "name": "Dr. Rohan Mehta, M.D.",
        "title": "Consultant Mental Health Specialist",
        "context": "Stress Physiology, Panic & Sleep Realignment",
        "specialties": ["Anxiety Management", "Sleep & Circadian Rhythm", "Panic & Stress Regulation"],
        "bio": "Specializes in stress physiology, circadian rhythm realignment, and practical grounding tools for high-stress university departments.",
        "languages": ["English", "Hindi", "Gujarati"],
        "experience_years": 10,
        "fee": 1200,
        "video_meet_link": "https://meet.jit.si/serenova-consultation-rohan-mehta",
        "avatar": "RM",
        "available_days": ["Tue", "Wed", "Fri", "Sat"],
        "available_slots": ["10:00 AM", "11:30 AM", "03:00 PM", "05:00 PM"],
        "is_accepting_students": True,
    },
    {
        "_id": "counsellor-03",
        "name": "Meera Nambiar, M.Sc.",
        "title": "Senior Counseling Psychologist",
        "context": "Campus Life Transition, Imposter Syndrome & Isolation",
        "specialties": ["Student Life Transition", "Social Isolation", "Imposter Syndrome"],
        "bio": "Dedicated to helping first-generation and relocating university students navigate new environments, identity questions, and interpersonal relationships.",
        "languages": ["English", "Hindi", "Malayalam"],
        "experience_years": 8,
        "fee": 500,
        "video_meet_link": "https://meet.jit.si/serenova-consultation-meera-nambiar",
        "avatar": "MN",
        "available_days": ["Mon", "Tue", "Thu", "Fri"],
        "available_slots": ["10:30 AM", "01:30 PM", "03:30 PM", "05:30 PM"],
        "is_accepting_students": True,
    },
    {
        "_id": "counsellor-04",
        "name": "Dr. Kabir Rao, M.Phil.",
        "title": "Mindfulness & Somatic Health Counsellor",
        "context": "Somatic Regulation, Attention & Nervous System Grounding",
        "specialties": ["Mindfulness-Based Stress Reduction", "Emotional Grounding", "Attention & Focus"],
        "bio": "Focuses on evidence-backed mindfulness routines, breathing techniques, and somatic awareness to ease nervous system overload.",
        "languages": ["English", "Hindi", "Kannada"],
        "experience_years": 9,
        "fee": 1500,
        "video_meet_link": "https://meet.jit.si/serenova-consultation-kabir-rao",
        "avatar": "KR",
        "available_days": ["Wed", "Thu", "Fri", "Sat"],
        "available_slots": ["11:00 AM", "02:30 PM", "04:30 PM"],
        "is_accepting_students": True,
    },
]

DEFAULT_RESOURCES = [
    {
        "_id": "res-01",
        "category": "study_stress",
        "category_label": "Academic Pressures",
        "title": "The Pomodoro & Task-Triage Protocol for Finals",
        "read_time": "3 min read",
        "summary": "How to deconstruct towering study syllabi into low-friction, manageable 25-minute sprints without spiraling.",
        "content": "When faced with 10 chapters before Monday, the brain naturally enters cognitive avoidance...",
        "tags": ["Study Skills", "Burnout", "Time Management"],
        "is_crisis_helpline": False
    },
    {
        "_id": "res-02",
        "category": "sleep",
        "category_label": "Rest & Recovery",
        "title": "Circadian Re-anchoring for College Students",
        "read_time": "4 min read",
        "summary": "Evidence-backed bedtime wind-down protocols, caffeine half-life awareness, and screen dimming tips.",
        "content": "College schedules can easily disrupt regular melatonin cycles. Even 15 minutes of early morning sunlight...",
        "tags": ["Sleep Hygiene", "Recovery", "Energy"],
        "is_crisis_helpline": False
    },
    {
        "_id": "res-03",
        "category": "crisis",
        "category_label": "Verified Helplines",
        "title": "Official Student Mental Health Helplines (India)",
        "read_time": "Immediate support",
        "summary": "Free, confidential, certified 24x7 crisis hotlines and counseling centers.",
        "content": "• Tele-MANAS (Govt of India): Dial 14416 or 1800-891-4416 (24x7, Toll-Free)\n• iCall: 9152987821\n• Vandrevala: 9999 666 555",
        "tags": ["Crisis", "Helpline", "24x7"],
        "is_crisis_helpline": True
    }
]

async def seed_database_if_empty():
    counsellors_col = db_manager.get_collection("counsellors")
    resources_col = db_manager.get_collection("resources")

    c_count = await counsellors_col.count_documents({})
    if c_count == 0:
        for c in DEFAULT_COUNSELLORS:
            await counsellors_col.insert_one(c)
        print("[Database] Seeded default counsellors.")

    r_count = await resources_col.count_documents({})
    if r_count == 0:
        for r in DEFAULT_RESOURCES:
            await resources_col.insert_one(r)
        print("[Database] Seeded default resources.")


DEMO_COUNSELLOR_LOGINS = {
    "counsellor-01": ("Dr. Ananya Sen", "ananya.sen@serenova.demo"),
    "counsellor-02": ("Dr. Rohan Mehta", "rohan.mehta@serenova.demo"),
    "counsellor-03": ("Meera Nambiar", "meera.nambiar@serenova.demo"),
    "counsellor-04": ("Dr. Kabir Rao", "kabir.rao@serenova.demo"),
}
DEMO_ADMIN_EMAIL = "admin@serenova.demo"


async def ensure_demo_data():
    """
    Demo mode only. Marks the four sample counsellor profiles as demo data and creates logins for them
    plus one admin, so every part of the site can be tried. Does nothing when DEMO_MODE is off.
    To go live: set DEMO_MODE=false, replace the counsellor documents with real people, and create their
    logins from the admin panel (or POST /api/admin/counsellor-accounts).
    """
    if not settings.DEMO_MODE:
        return
    users = db_manager.get_collection("users")
    counsellors = db_manager.get_collection("counsellors")
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    for cid in DEMO_COUNSELLOR_LOGINS:
        if await counsellors.find_one({"_id": cid}):
            await counsellors.update_one({"_id": cid}, {"$set": {"is_demo": True}})

    for cid, (name, email) in DEMO_COUNSELLOR_LOGINS.items():
        if not await counsellors.find_one({"_id": cid}) or await users.find_one({"email": email}):
            continue
        await users.insert_one({
            "name": name, "email": email, "password_hash": hash_password(settings.DEMO_PASSWORD),
            "role": "counsellor", "counsellor_id": cid, "email_verified": True,
            "created_at": now, "updated_at": now, "profile": {"language": "en"},
        })
    if not await users.find_one({"email": DEMO_ADMIN_EMAIL}):
        await users.insert_one({
            "name": "Demo Admin", "email": DEMO_ADMIN_EMAIL, "password_hash": hash_password(settings.DEMO_PASSWORD),
            "role": "admin", "email_verified": True,
            "created_at": now, "updated_at": now, "profile": {"language": "en"},
        })
    # Make the original demo student a verified, consented account so the demo isn't interrupted
    demo_student = await users.find_one({"email": "student@university.edu"})
    if not demo_student:
        await users.insert_one({
            "name": "Demo Student", "email": "student@university.edu", "password_hash": hash_password(settings.DEMO_PASSWORD),
            "role": "student", "email_verified": True, "consent": {"version": "2026-11", "accepted_at": now},
            "created_at": now, "updated_at": now, "profile": {"language": "en", "university": "Demo University"},
        })
    elif "role" not in demo_student:
        await users.update_one({"_id": demo_student["_id"]}, {"$set": {"role": "student", "email_verified": True}})
    print("[Database] Demo accounts ready (demo mode).")
