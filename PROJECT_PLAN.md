# PROJECT PLAN — Digital Mental Health & Psychological Support System for Students

> Last updated: Phase 2 corrections applied.

---

## 1. Project Overview

**Product Name (working title):** Serenova  
**Purpose:** A safe, warm, student-centric digital platform that supports emotional well-being through mood tracking, journaling, self-assessment, AI-assisted conversation, and counselling access — without replacing professional care.

**Core Principle:** This platform is a _support companion_, not a diagnostic or medical tool. Every feature, disclaimer, and UX decision must reinforce that.

### Plan Corrections (Phase 2)

| # | Correction |
|---|---|
| A | AI integration is **provider/model agnostic** — configured via `AI_PROVIDER`, `AI_MODEL`, `GROQ_API_KEY` (and equivalent keys for other providers). The AI service sits behind an abstraction layer; switching providers requires no application code changes. Do NOT hardcode any model name. |
| B | The self-assessment is a **20-question screening built from the standard PHQ-9 (depression) and GAD-7 (anxiety) plus a 4-item student check-in**, clearly labelled: _"This screening is for general self-reflection and well-being awareness. It is not a medical diagnosis."_ PHQ-9 and GAD-7 use their published cut-points; the student check-in is context only and not validated. It does not diagnose. |
| C | Helpline/crisis contact information is **stored in the resource database** (not hardcoded in frontend components). Content must be verified before production deployment. |
| D | JWT with sessionStorage is a **deliberate v1 architecture decision**, documented as such. Auth logic is isolated in a dedicated module so the token strategy can be changed independently later. |
| E | **No admin panel** in v1. Appointments are student-facing and request-based (pending / confirmed / cancelled). |

**Target Users:** University/college students experiencing everyday mental health challenges — stress, burnout, anxiety, loneliness, academic pressure.

---

## 2. Functional Requirements

| # | Requirement | Priority |
|---|---|---|
| FR-01 | Landing page with product identity, purpose, features, privacy policy, login/register CTA | Must |
| FR-02 | User registration (name, email, password) with validation and duplicate-email prevention | Must |
| FR-03 | User login with JWT authentication and protected routes | Must |
| FR-04 | User profile — view and update own profile only | Must |
| FR-05 | Personalized student dashboard — gateway to all features | Must |
| FR-06 | Mood tracking — 5-level mood selection, optional note, timestamp, history, visualization | Must |
| FR-07 | Non-diagnostic self-assessment — questionnaire, score, interpretation, resource suggestions | Must |
| FR-08 | Private journal — create, edit, delete, view entries; optional mood/tag association | Must |
| FR-09 | AI chatbot — supportive conversation with safety/crisis layer | Must |
| FR-10 | Safety/crisis handling — deterministic pre-screening before AI, calm redirection | Must |
| FR-11 | Resource center — curated well-being content, editorial layout | Must |
| FR-12 | Appointments/counselling — book, view, cancel appointments | Must |
| FR-13 | Chat history — persistent sessions, per-user, cross-user isolation | Should |
| FR-14 | Logout and session invalidation | Must |
| FR-15 | CORS-safe REST API with proper error handling | Must |
| FR-16 | Health-check endpoint | Must |

---

## 3. Technology Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Language | HTML5 / CSS3 / Vanilla JS (ES Modules) | Specified in requirements; avoids heavy framework overhead |
| Build/Bundler | Vite | Fast dev server, ES module bundling, easy Vercel deployment |
| Fonts | Google Fonts — editorial serif (e.g., Playfair Display or Cormorant) + clean sans (e.g., DM Sans or Inter) | Warm editorial identity |
| Icons | Lucide Icons (SVG sprite) | Lightweight, consistent |
| Charts | Chart.js (mood visualization only) | Minimal, canvas-based, no bloat |

### Backend
| Layer | Choice |
|---|---|
| Language | Python 3.11+ |
| Framework | FastAPI |
| Validation | Pydantic v2 |
| Auth | python-jose (JWT) + passlib[bcrypt] |
| HTTP Client | httpx (async, for AI service calls) |
| ASGI Server | Uvicorn |

### Database
| Choice | MongoDB Atlas (managed cloud) |
|---|---|
| ODM | Motor (async MongoDB driver) |
| Schema validation | Pydantic models mapped to collections |

### AI
| Choice | LLaMA-compatible API (Groq, Together AI, or any OpenAI-compatible endpoint) |
|---|---|
| Protocol | OpenAI-compatible REST API via httpx |
| Safety Layer | Deterministic keyword/pattern matching before calling AI |

### Infrastructure
| Component | Platform |
|---|---|
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Database | MongoDB Atlas |

---

## 4. System Architecture

```
+----------------------------------------------------------+
|                     BROWSER (CLIENT)                      |
|  Vanilla JS + Vite SPA  <->  Native Fetch API            |
+--------------------------|-------------------------------+
                           | HTTPS REST (JSON)
                           v
+----------------------------------------------------------+
|              FASTAPI BACKEND (Render)                     |
|                                                           |
|  +----------+  +-----------+  +---------------------+   |
|  |  Router  |  |  Auth     |  |   AI Service Layer  |   |
|  |  Layer   |  | Middleware|  | (Safety + LLM)      |   |
|  +----+-----+  +-----------+  +---------+-----------+   |
|       |                                 |                 |
|  +----v------------------------------------+             |
|  |        Service / CRUD Layer             |             |
|  +----+------------------------------------+             |
|       |                                  | HTTPS         |
+-------|------------------------------------------+------+
        | Motor (async)                    |
        v                                  v
+---------------+              +---------------------+
|  MongoDB Atlas|              |  LLM Provider API   |
|  (cloud DB)   |              |  (Groq / Together)  |
+---------------+              +---------------------+
```

**Key architectural decisions:**
- Frontend is a pure SPA served from Vercel; all data via REST API.
- AI Service is an internal module within the FastAPI app, isolated in its own package for clean separation.
- Safety screening is a deterministic Python function — no AI call is made for flagged messages.
- All secrets in environment variables; never in source code.

---

## 5. Database Schema

### Collection: `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique, indexed)",
  "password_hash": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "profile": {
    "university": "string (optional)",
    "year_of_study": "string (optional)",
    "avatar_color": "string (hex)"
  }
}
```

### Collection: `moods`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "level": "enum: very_low | low | neutral | good | very_good",
  "note": "string (optional)",
  "recorded_at": "datetime (indexed)"
}
```

### Collection: `journals`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "title": "string",
  "content": "string",
  "mood_level": "string (optional)",
  "tags": ["string"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Collection: `assessments`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "questionnaire_version": "string",
  "answers": [{"question_id": "string", "answer": "integer 0-3"}],
  "raw_score": "integer",
  "category": "enum: low_concern | mild | moderate | high_concern",
  "taken_at": "datetime"
}
```

### Collection: `appointments`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "type": "enum: general_support | counselling | crisis",
  "preferred_date": "datetime",
  "preferred_time_slot": "string",
  "notes": "string (optional)",
  "status": "enum: pending | confirmed | cancelled",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Collection: `chat_sessions`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "title": "string (auto-generated from first message)",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Collection: `chat_messages`
```json
{
  "_id": "ObjectId",
  "session_id": "ObjectId (indexed)",
  "user_id": "ObjectId (indexed)",
  "role": "enum: user | assistant",
  "content": "string",
  "safety_flagged": "boolean",
  "timestamp": "datetime"
}
```

### Collection: `resources`
```json
{
  "_id": "ObjectId",
  "category": "enum: stress | exam_stress | relaxation | sleep | balance | emotional | professional_help | crisis",
  "title": "string",
  "body": "string (markdown)",
  "tags": ["string"],
  "external_links": [{"label": "string", "url": "string"}],
  "order": "integer"
}
```

### Indexes
- `users.email` — unique
- `moods.user_id` + `moods.recorded_at` — compound
- `journals.user_id` + `journals.created_at` — compound
- `assessments.user_id`
- `appointments.user_id`
- `chat_sessions.user_id`
- `chat_messages.session_id`

---

## 6. API Structure

### Base
```
GET  /api/health
```

### Auth — `/api/auth`
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
```

### Users — `/api/users`
```
GET  /api/users/me
PATCH /api/users/me
```

### Moods — `/api/moods`
```
POST  /api/moods
GET   /api/moods
GET   /api/moods/latest
DELETE /api/moods/{id}
```

### Journals — `/api/journals`
```
POST  /api/journals
GET   /api/journals
GET   /api/journals/{id}
PATCH /api/journals/{id}
DELETE /api/journals/{id}
```

### Assessments — `/api/assessments`
```
GET   /api/assessments/questions
POST  /api/assessments
GET   /api/assessments
GET   /api/assessments/latest
```

### Chat — `/api/chat`
```
POST  /api/chat/sessions
GET   /api/chat/sessions
GET   /api/chat/sessions/{id}
POST  /api/chat/sessions/{id}/messages
DELETE /api/chat/sessions/{id}
```

### Appointments — `/api/appointments`
```
POST  /api/appointments
GET   /api/appointments
GET   /api/appointments/{id}
PATCH /api/appointments/{id}/cancel
```

### Resources — `/api/resources`
```
GET   /api/resources
GET   /api/resources/{id}
```

All endpoints except `/api/health`, `/api/auth/*`, and `GET /api/resources` require JWT Bearer token.

---

## 7. Frontend Page Structure

```
/                      -> Landing page
/auth/register         -> Registration
/auth/login            -> Login
/dashboard             -> Student dashboard (protected)
/mood                  -> Mood tracker (protected)
/mood/history          -> Mood history & chart (protected)
/journal               -> Journal list (protected)
/journal/new           -> New entry (protected)
/journal/:id           -> View/edit entry (protected)
/assessment            -> Self-assessment flow (protected)
/assessment/results    -> Latest result (protected)
/chat                  -> AI chatbot (protected)
/resources             -> Resource center (public)
/appointments          -> Appointments list (protected)
/appointments/new      -> Book appointment (protected)
/profile               -> User profile (protected)
/404                   -> Not found
```

---

## 8. Frontend Component Architecture

```
frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js
    ├── router.js
    ├── store.js
    ├── api/
    │   ├── client.js
    │   ├── auth.js
    │   ├── moods.js
    │   ├── journals.js
    │   ├── assessments.js
    │   ├── chat.js
    │   ├── appointments.js
    │   └── resources.js
    ├── pages/
    │   ├── Landing.js
    │   ├── Login.js
    │   ├── Register.js
    │   ├── Dashboard.js
    │   ├── MoodTracker.js
    │   ├── MoodHistory.js
    │   ├── Journal.js
    │   ├── JournalEntry.js
    │   ├── Assessment.js
    │   ├── AssessmentResults.js
    │   ├── Chat.js
    │   ├── Resources.js
    │   ├── Appointments.js
    │   └── Profile.js
    ├── components/
    │   ├── Navbar.js
    │   ├── Sidebar.js
    │   ├── MoodPicker.js
    │   ├── MoodChart.js
    │   ├── ChatBubble.js
    │   ├── AssessmentQuestion.js
    │   ├── ResourceCard.js
    │   ├── AppointmentCard.js
    │   ├── Modal.js
    │   ├── Toast.js
    │   └── Loader.js
    └── styles/
        ├── tokens.css
        ├── global.css
        ├── components.css
        └── pages/
```

---

## 9. Backend Structure

```
backend/
├── main.py
├── config.py
├── database.py
├── dependencies.py
├── routers/
│   ├── auth.py
│   ├── users.py
│   ├── moods.py
│   ├── journals.py
│   ├── assessments.py
│   ├── chat.py
│   ├── appointments.py
│   └── resources.py
├── models/
│   ├── user.py
│   ├── mood.py
│   ├── journal.py
│   ├── assessment.py
│   ├── chat.py
│   ├── appointment.py
│   └── resource.py
├── services/
│   ├── auth_service.py
│   ├── mood_service.py
│   ├── journal_service.py
│   ├── assessment_service.py
│   ├── appointment_service.py
│   └── resource_service.py
├── ai/
│   ├── __init__.py
│   ├── ai_service.py
│   ├── safety_layer.py
│   ├── prompts.py
│   └── fallback.py
├── utils/
│   ├── security.py
│   └── pagination.py
├── requirements.txt
├── .env.example
└── Procfile
```

---

## 10. Authentication Architecture

### Flow
```
1. User submits email + password
2. Backend verifies credentials (bcrypt compare)
3. On success: generate signed JWT (HS256)
   Payload: { sub: user_id, exp: now+7d }
4. JWT returned to frontend
5. Frontend stores token in sessionStorage
6. All protected requests include: Authorization: Bearer <token>
7. FastAPI dependency get_current_user decodes + validates JWT
8. Logout: frontend discards token
```

### Security Details
- Passwords hashed with bcrypt (passlib[bcrypt], cost factor 12)
- JWT secret: 256-bit random string from environment variable
- JWT expiry: 7 days (configurable)
- All auth errors return generic messages (no user enumeration)

---

## 11. AI Architecture

### Flow
```
User Message
     |
     v
Safety Layer (always runs first — deterministic)
     |
Crisis detected? ---YES---> Static Crisis Response
     |
     NO
     v
AI Service (httpx call to LLM API)
     |
API fails? ---YES---> Fallback Response
     |
     NO
     v
AI Response (returned to user)
```

### System Prompt (condensed)
- Identity: supportive well-being companion for students
- Cannot diagnose, prescribe, replace professional care
- Tone: warm, non-judgmental, calm, concise

### Safety Keywords (deterministic)
Patterns cover: self-harm indicators, suicidal ideation, immediate danger expressions.
When matched: static crisis response with helpline information.

### LLM Provider
- Default: Groq (LLaMA 3) via OpenAI-compatible API
- Config: AI_BASE_URL, AI_API_KEY, AI_MODEL in .env
- Timeout: 30 seconds; on timeout -> fallback response

---

## 12. Safety Architecture

### Crisis Response
When triggered:
1. Acknowledge warmly (non-alarmist)
2. Express genuine care
3. Provide helplines (India: iCall 9152987821, Vandrevala 1860-2662-345)
4. Encourage speaking to a trusted person
5. Do NOT continue as casual conversation

### Disclaimers (mandatory UI elements)
- Assessment: "Screening only — not a diagnosis."
- Chat: "AI well-being companion. Does not replace professional care."

---

## 13. Security Considerations

| Risk | Mitigation |
|---|---|
| Plaintext passwords | bcrypt hashing |
| JWT secret exposure | Environment variable only |
| Cross-user data access | All queries filtered by user_id from JWT |
| XSS | textContent only; no raw innerHTML with user data |
| CORS | Configured origins via environment variable |
| API key exposure | AI keys in .env only |
| .env committed | .gitignore includes .env |

---

## 14. Design System

### Color Palette
```
--color-ivory:      #F9F6F0   (background)
--color-charcoal:   #2C2A26   (primary text)
--color-terracotta: #C4623A   (primary accent)
--color-saffron:    #D49B3A   (secondary accent)
--color-dusty-rose: #C47E7E   (soft accent)
--color-sage:       #8A9E8A   (subtle / success)
--color-surface:    #F2EDE5   (card backgrounds)
--color-border:     #E0D9CF   (subtle borders)
```

### Typography
```
--font-display: 'Cormorant Garamond', serif  (headings, editorial)
--font-body:    'DM Sans', sans-serif        (UI, body text)
```

### Motion
- Transitions: 200-300ms ease-out
- @media (prefers-reduced-motion: reduce) -> all animations disabled

---

## 15. Testing Strategy

### Backend
- pytest — unit tests for services, auth, safety layer
- pytest-asyncio — async route tests
- httpx.AsyncClient — FastAPI test client
- mongomock — mock MongoDB for unit tests

### Frontend
- Manual smoke testing per feature
- Console-error-free requirement for each page
- Keyboard navigation and contrast check

### Integration
- End-to-end flow tests after Phase 8

### Definition of Done (per feature)
- Frontend renders correctly
- Backend returns correct response
- Database read/write confirmed
- Authentication enforced (401)
- Authorization enforced (403/404)
- Input validation works (422)
- Error states handled in UI
- No console errors

---

## 16. Deployment Strategy

### Frontend (Vercel)
- vercel.json with SPA rewrites
- VITE_API_BASE_URL from Vercel env settings
- Build: npm run build; Output: dist/

### Backend (Render)
- Start: uvicorn main:app --host 0.0.0.0 --port $PORT
- Env vars: MONGODB_URL, JWT_SECRET, AI_API_KEY, AI_BASE_URL, AI_MODEL, CORS_ORIGINS

### Database (MongoDB Atlas)
- Free tier (M0) for development
- Connection string in MONGODB_URL env variable

---

## 17. Development Phases

| Phase | Goal |
|---|---|
| 1 | Planning — PROJECT_PLAN.md |
| 2 | Architecture & Design System |
| 3 | Frontend Foundation (Landing, Auth pages, Layout, Routing) |
| 4 | Backend Foundation (FastAPI app, CORS, health, DB connection) |
| 5 | Authentication (Register, Login, JWT, Protected Routes) |
| 6 | Core Features (Mood, Journal, Assessment, Appointments) |
| 7 | AI Chatbot & Safety Layer |
| 8 | Frontend-Backend Integration |
| 9 | Testing & Debugging |
| 10 | Production Polish |
| 11 | Deployment Preparation |

---

## 18. Verification Strategy

After every phase:
BUILD -> RUN -> TEST -> INSPECT ERRORS -> IDENTIFY ROOT CAUSE
-> FIX -> RUN AGAIN -> RETEST -> REGRESSION TEST -> CONTINUE

A feature is complete only when all of the following are true:
- Frontend works
- Backend works
- Database works
- Authentication works
- Authorization works
- Error handling works
- Tests pass

---

## 19. Ambiguities & Decisions Made

| # | Ambiguity | Decision |
|---|---|---|
| A-01 | No LLM provider named | Default Groq (LLaMA 3, free tier); config-driven |
| A-02 | No specific questionnaire | PHQ-9 + GAD-7 + 4-item student check-in (non-diagnostic, item-9 safety flag) |
| A-03 | No counsellor admin system | Student request-only workflow; status: pending/confirmed/cancelled |
| A-04 | Resources static vs DB | Store in MongoDB; seed via script |
| A-05 | JWT logout server-side? | Client-side token discard in v1 |
| A-06 | Session storage | httpOnly cookie (JavaScript cannot read it); only the user profile is kept in sessionStorage |
| A-07 | Chat history optional? | Implement it — real value, straightforward |
| A-08 | No region for helplines | India helplines (iCall, Vandrevala); configurable |
| A-09 | Admin panel? | No admin panel in v1 |
| A-10 | Vite vs plain HTML | Vite — better DX, same HTML/CSS/JS output |

---

*Plan version: 1.0 — Phase 1 complete*  
*Status: Awaiting review before Phase 2 begins.*
