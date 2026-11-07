import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ── User Models ───────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    university: Optional[str] = None
    year_of_study: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    university: Optional[str] = None
    year_of_study: Optional[str] = None
    avatar_color: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    created_at: str
    profile: Optional[Dict[str, Any]] = None

# ── Mood Models ───────────────────────────────────────────────
class MoodCreate(BaseModel):
    level: str = Field(..., pattern="^(very_low|low|neutral|good|very_good)$")
    score: int = Field(..., ge=1, le=5)
    note: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = Field(default_factory=list)

class MoodResponse(BaseModel):
    id: str
    user_id: str
    level: str
    score: int
    note: Optional[str] = None
    tags: List[str] = []
    recorded_at: str

# ── Journal Models ────────────────────────────────────────────
class JournalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    mood_level: Optional[str] = None
    tags: Optional[List[str]] = Field(default_factory=list)

class JournalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    mood_level: Optional[str] = None
    tags: Optional[List[str]] = None

class JournalResponse(BaseModel):
    id: str
    user_id: str
    title: str
    content: str
    mood_level: Optional[str] = None
    tags: List[str] = []
    created_at: str
    updated_at: str

# ── Assessment Models ─────────────────────────────────────────
class AnswerItem(BaseModel):
    question_id: int
    score: int = Field(..., ge=0, le=3)

class AssessmentSubmit(BaseModel):
    answers: List[AnswerItem]

class AssessmentResponse(BaseModel):
    id: str
    user_id: str
    total_score: int
    score_schema_version: Optional[int] = None
    phq9_score: Optional[int] = None
    gad7_score: Optional[int] = None
    student_life_answers: Optional[List[Dict[str, int]]] = None
    safety_item_score: Optional[int] = None
    category: str
    level_label: str
    interpretation: str
    recommendations: List[str]
    disclaimer: str
    taken_at: str

# ── Counsellor & Appointment Models ───────────────────────────
class CounsellorResponse(BaseModel):
    id: str
    name: str
    title: str
    context: Optional[str] = None
    specialties: List[str]
    bio: str
    languages: List[str]
    experience_years: int
    fee: int = 500
    video_meet_link: str = ""
    avatar: str
    available_days: List[str]
    available_slots: List[str]
    is_accepting_students: bool = True

class AppointmentCreate(BaseModel):
    counsellor_id: str
    support_type: str = Field(..., pattern="^(academic_stress|anxiety_mindfulness|personal_counselling|general_support)$")
    preferred_date: str  # YYYY-MM-DD
    time_slot: str       # e.g. "10:00 AM"
    student_notes: Optional[str] = Field(None, max_length=1000)

class AppointmentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|cancelled)$")

class AppointmentResponse(BaseModel):
    id: str
    user_id: str
    counsellor_id: str
    counsellor_name: Optional[str] = None
    counsellor_title: Optional[str] = None
    support_type: str
    preferred_date: str
    time_slot: str
    student_notes: Optional[str] = None
    status: str
    created_at: str
    updated_at: str

# ── Chat Models ───────────────────────────────────────────────
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "Reflective Conversation"

class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0

class ChatMessageSend(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    role: str
    content: str
    safety_flagged: bool = False
    timestamp: str

# ── Resource Models ───────────────────────────────────────────
class ResourceResponse(BaseModel):
    id: str
    category: str
    category_label: str
    title: str
    read_time: str
    summary: str
    content: str
    tags: List[str]
    is_crisis_helpline: bool = False
