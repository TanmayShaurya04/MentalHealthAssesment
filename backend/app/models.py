import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator

# ── User Models ───────────────────────────────────────────────
def _check_password_strength(value: str) -> str:
    if not any(c.isalpha() for c in value) or not any(c.isdigit() for c in value):
        raise ValueError("Password must contain at least one letter and one number")
    return value


class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    university: Optional[str] = None
    year_of_study: Optional[str] = None

    @field_validator("password")
    @classmethod
    def strong(cls, v):
        return _check_password_strength(v)


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong(cls, v):
        return _check_password_strength(v)


class VerifyEmail(BaseModel):
    token: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def strong(cls, v):
        return _check_password_strength(v)


class DeleteAccount(BaseModel):
    password: str


class ConsentUpdate(BaseModel):
    version: str = Field(..., max_length=20)


class CounsellorAccountCreate(BaseModel):
    counsellor_id: str
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    university: Optional[str] = None
    year_of_study: Optional[str] = None
    avatar_color: Optional[str] = None
    daily_reminder: Optional[bool] = None
    language: Optional[str] = Field(None, pattern="^(en|hi)$")

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

class AssessmentSection(BaseModel):
    id: str
    title: str
    instrument: str
    validated: bool = True
    score: int
    max: int
    severity: str
    rank: int = 0

class AssessmentResponse(BaseModel):
    id: str
    user_id: str
    total_score: int
    max_score: Optional[int] = None
    sections: Optional[List[AssessmentSection]] = None
    safety_flag: bool = False
    score_schema_version: Optional[int] = None
    phq9_score: Optional[int] = None
    gad7_score: Optional[int] = None
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
    is_demo: bool = False

class AppointmentCreate(BaseModel):
    counsellor_id: str
    support_type: str = Field(..., pattern="^(academic_stress|anxiety_mindfulness|personal_counselling|general_support)$")
    preferred_date: str  # YYYY-MM-DD
    time_slot: str       # e.g. "10:00 AM"
    student_notes: Optional[str] = Field(None, max_length=1000)

class AppointmentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(pending|confirmed|cancelled)$")


class CounsellorAppointmentUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(confirmed|declined|completed)$")
    preferred_date: Optional[str] = None   # reschedule
    time_slot: Optional[str] = None
    message: Optional[str] = Field(None, max_length=500)  # optional note to the student


class SessionNote(BaseModel):
    note: str = Field("", max_length=4000)


class AvailabilityUpdate(BaseModel):
    available_days: List[str]
    available_slots: List[str]
    is_accepting_students: bool = True

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
    counsellor_message: Optional[str] = None
    video_meet_link: Optional[str] = None
    created_at: str
    updated_at: str

# ── Chat Models ───────────────────────────────────────────────
class ChatSessionCreate(BaseModel):
    title: Optional[str] = "Reflective Conversation"

class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    topic: str = "general"
    has_crisis: bool = False
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
    image: Optional[str] = None
    featured: bool = False
    quick: bool = False
