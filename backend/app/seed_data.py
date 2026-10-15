import uuid
import datetime
from typing import List, Dict, Any
from app.database import db_manager

DEFAULT_COUNSELLORS: List[Dict[str, Any]] = [
    {
        "_id": "counsellor-01",
        "name": "Dr. Ananya Sen, Ph.D.",
        "title": "Lead Student Well-Being Psychologist",
        "specialties": ["Academic Burnout", "Exam Pressure", "Perfectionism & Overwhelm"],
        "bio": "Over 12 years supporting college students through rigorous academic pressures. Her approach blends Cognitive Behavioral techniques with compassionate pacing.",
        "languages": ["English", "Hindi", "Bengali"],
        "experience_years": 12,
        "avatar": "AS",
        "available_days": ["Mon", "Wed", "Thu", "Fri"],
        "available_slots": ["09:30 AM", "11:00 AM", "02:00 PM", "04:00 PM"],
        "is_accepting_students": True,
    },
    {
        "_id": "counsellor-02",
        "name": "Dr. Rohan Mehta, M.D.",
        "title": "Consultant Mental Health Specialist",
        "specialties": ["Anxiety Management", "Sleep & Circadian Rhythm", "Panic & Stress Regulation"],
        "bio": "Specializes in stress physiology, circadian rhythm realignment, and practical grounding tools for high-stress university departments.",
        "languages": ["English", "Hindi", "Gujarati"],
        "experience_years": 10,
        "avatar": "RM",
        "available_days": ["Tue", "Wed", "Fri", "Sat"],
        "available_slots": ["10:00 AM", "11:30 AM", "03:00 PM", "05:00 PM"],
        "is_accepting_students": True,
    },
    {
        "_id": "counsellor-03",
        "name": "Meera Nambiar, M.Sc.",
        "title": "Senior Counseling Psychologist",
        "specialties": ["Student Life Transition", "Social Isolation", "Imposter Syndrome"],
        "bio": "Dedicated to helping first-generation and relocating university students navigate new environments, identity questions, and interpersonal relationships.",
        "languages": ["English", "Hindi", "Malayalam"],
        "experience_years": 8,
        "avatar": "MN",
        "available_days": ["Mon", "Tue", "Thu", "Fri"],
        "available_slots": ["10:30 AM", "01:30 PM", "03:30 PM", "05:30 PM"],
        "is_accepting_students": True,
    },
    {
        "_id": "counsellor-04",
        "name": "Dr. Kabir Rao, M.Phil.",
        "title": "Mindfulness & Somatic Health Counsellor",
        "specialties": ["Mindfulness-Based Stress Reduction", "Emotional Grounding", "Attention & Focus"],
        "bio": "Focuses on evidence-backed mindfulness routines, breathing techniques, and somatic awareness to ease nervous system overload.",
        "languages": ["English", "Hindi", "Kannada"],
        "experience_years": 9,
        "avatar": "KR",
        "available_days": ["Wed", "Thu", "Fri", "Sat"],
        "available_slots": ["11:00 AM", "02:30 PM", "04:30 PM"],
        "is_accepting_students": True,
    },
]

DEFAULT_RESOURCES: List[Dict[str, Any]] = [
    {
        "_id": "res-01",
        "category": "study_stress",
        "category_label": "Academic Pressures",
        "title": "When Exam Pressure Becomes Too Much",
        "read_time": "4 min read",
        "summary": "Practical somatic grounding and task triage when deadlines feel paralyzing.",
        "content": """### Breaking the Panic-Paralysis Loop
When exams loom, your brain's threat-detection network interprets academic deadlines as physical danger. This triggers fight-or-flight, shutting down working memory and focus.

#### 1. The 10-Minute Reset
Before attempting to study, spend 10 minutes resetting your nervous system:
- Inhale for 4 counts through your nose.
- Exhale slowly for 7 counts through your mouth.
- Place your feet flat on the floor and feel the ground holding your weight.

#### 2. Micro-Triage Your Work
Instead of trying to 'study biology for 6 hours', select one sub-topic for 25 minutes. Give yourself permission to pause as soon as the timer ends.

Remember: Your worth as a human is entirely distinct from any academic test.""",
        "tags": ["Exams", "Focus", "Grounding"],
        "is_crisis_helpline": False,
    },
    {
        "_id": "res-02",
        "category": "sleep",
        "category_label": "Rest & Recovery",
        "title": "Building a Sleep Rhythm that Actually Works in University",
        "read_time": "5 min read",
        "summary": "Realistic circadian shifts for students dealing with late study sessions and dorm schedules.",
        "content": """### Quality Rest in Unforgiving Environments
Late nights, blue light, and racing thoughts make restful sleep difficult for students.

#### 1. Anchor Your Wake Time First
Rather than forcing yourself to fall asleep early when you aren't tired, fix your morning wake-up time within a 30-minute window every day. Your circadian drive will naturally shift.

#### 2. The 30-Minute Brain Dump
Keep a journal next to your bed. If tomorrow's to-do list loops in your mind, write every item onto paper. Externalizing the thoughts signals to your brain that it can safely stop rehearsing them.

#### 3. Low-Stimulus Buffer
Stop reading course material 30 minutes before bed. Switch to warm, non-fluorescent lighting.""",
        "tags": ["Sleep", "Habits", "Recovery"],
        "is_crisis_helpline": False,
    },
    {
        "_id": "res-03",
        "category": "emotional_balance",
        "category_label": "Emotional Health",
        "title": "Why Feeling Lost Doesn't Mean You're Failing",
        "read_time": "4 min read",
        "summary": "Reframing disorientation, career anxiety, and the pressure to have everything figured out.",
        "content": """### Navigating University Transitions
Almost every student encounters a quiet season of questioning: *Am I in the right major? Do I belong here? Why does everyone else seem so put-together?*

#### 1. The Comparison Mirage
Social circles display curated achievements. You compare your internal mess to everyone else's public highlight reel.

#### 2. Value Orientation vs. Fixed Outcomes
Focus on small daily values rather than distant 5-year plans. Are you being curious today? Are you being kind to your physical body? The path clarifies through steady, small steps.""",
        "tags": ["Identity", "Transition", "Self-Compassion"],
        "is_crisis_helpline": False,
    },
    {
        "_id": "res-04",
        "category": "crisis",
        "category_label": "Verified Helplines",
        "title": "Verified 24x7 Student Support Helplines",
        "read_time": "Immediate support",
        "summary": "National mental health hotlines, university clinic guides, and crisis hotlines.",
        "content": """### Immediate, Confidential Support
If you or someone you know is in severe distress or thinking of self-harm, please connect immediately with these verified, free services:

- **Tele-MANAS (Govt of India)**: Dial `14416` or `1800-891-4416` (24x7, Toll-Free)
- **KIRAN Helpline**: Dial `1800-599-0019` (24x7, Ministry of Social Justice)
- **iCall Psychosocial Helpline**: Dial `9152987821` (Mon–Sat, 10 AM – 8 PM)
- **Vandrevala Foundation**: Dial `9999 666 555` (24x7, Multi-lingual)
- **National Emergency Response**: Dial `112`

All calls are confidential and handled by compassionate counselors.""",
        "tags": ["Helpline", "Emergency", "Support"],
        "is_crisis_helpline": True,
    },
]

async def seed_database_if_empty():
    counsellors_col = db_manager.get_collection("counsellors")
    count_c = await counsellors_col.count_documents()
    if count_c == 0:
        for c in DEFAULT_COUNSELLORS:
            await counsellors_col.insert_one(c)
        print(f"Seeded {len(DEFAULT_COUNSELLORS)} counsellors.")

    resources_col = db_manager.get_collection("resources")
    count_r = await resources_col.count_documents()
    if count_r == 0:
        for r in DEFAULT_RESOURCES:
            await resources_col.insert_one(r)
        print(f"Seeded {len(DEFAULT_RESOURCES)} curated resources.")
