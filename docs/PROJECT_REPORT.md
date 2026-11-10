# Project Report: Serenova — Digital Student Well-Being & Psychological Support System

**Academic & Technical Project Documentation**  
**Repository:** [TanmayShaurya04/Serenova](https://github.com/TanmayShaurya04/Serenova)  
**Version:** 1.0.0 (Production-Ready)  
**Date:** October 2026  

---

## 1. Executive Summary

**Serenova** is a full-stack, privacy-centric digital mental health platform specifically engineered to address psychological stressors in collegiate and university environments (academic burnout, social isolation, exam anxiety, sleep disruption, and clinical depression).

Unlike generic mental health apps, Serenova combines:
1. An **offline-first hybrid AI Companion** equipped with safety guardrails and national crisis helpline escalation (Tele-MANAS, Kiran).
2. A guided **20-item screening** (the PHQ-9 and GAD-7 self-report questionnaires plus a 4-item student check-in).
3. A **student-subsidized tele-counselling module** offering verified professional consultations (capped under ₹2,000) with integrated one-click encrypted Jitsi video meetings.
4. An **expressive mood & journal tracker** with custom vector visual artwork and temporal emotional trend graphing via Chart.js.

The system is architected as an asynchronous, containerized micro-monolith with a high-performance **FastAPI (Python)** backend and a lightweight **Vite single-page app (vanilla JavaScript, no framework)**, backed by a dual-layer persistence engine (MongoDB with auto-fallback to zero-dependency transactional JSON storage).

---

## 2. Problem Statement & Motivation

### 2.1 The Crisis in Higher Education
- **Prevalence:** Over 60% of university undergraduates report experiencing overwhelming anxiety or depressive symptoms during academic terms, exacerbated by competitive pressure and financial concerns.
- **Barrier of Cost:** Private psychotherapeutic sessions in urban centers range between ₹1,500 and ₹5,000 per hour, making continuous care unaffordable for non-earning students.
- **Stigma & Bureaucracy:** Campus counseling centers often lack anonymity and suffer from long waiting lists, causing students to avoid seeking help until crisis levels are reached.
- **Internet/API Dependency Risks:** Many modern "AI therapy" platforms rely strictly on paid external cloud APIs (e.g. OpenAI GPT-4). If API credits lapse or network drops occur during an acute student panic attack, the platform becomes inoperable.

### 2.2 Serenova's Solution
Serenova provides an immediate, accessible, and resilient first line of psychological triage:
- **Zero-Cost Local AI Support:** An embedded rule-based cognitive behavioral therapy (CBT) engine running 100% offline with zero latency and zero external API dependencies.
- **Transparent & Subsidized Counselling:** Fixed, transparent fees (₹500 to ₹1,500) with verified practitioner bios, context descriptions, and instant video rooms.
- **Self-Service Assessment:** Objective scoring giving students tangible data regarding their anxiety and depressive states.

---

## 3. Technology Stack & Tooling

| Component | Technology | Version | Purpose / Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend** | Vanilla JavaScript SPA (Vite, Chart.js) | Vite 5 | Lightweight, component-driven client architecture |
| **Frontend Build Tool** | Vite | 5.4.x | Sub-second Hot Module Replacement (HMR) and optimized rollup production bundles |
| **Data Visualization** | Chart.js | 4.4.x | Responsive HTML5 canvas rendering for weekly emotional trends |
| **Styling & Artwork** | CSS3 & Custom SVG | Modern | Responsive design, high-contrast dark/light tones, zero CSS runtime bloat |
| **Backend Framework** | FastAPI | >= 0.110.0 | High-throughput asynchronous ASGI web API with automatic OpenAPI/Swagger documentation |
| **ASGI Server** | Uvicorn | >= 0.28.0 | Lightning-fast asynchronous worker process |
| **Validation & Schema**| Pydantic v2 | >= 2.6.0 | Strict data validation, deserialization, and type-safety |
| **Authentication** | PyJWT + Bcrypt | 2.8 / 4.1 | Stateless Bearer token security with salted password hashing |
| **Database (Primary)** | MongoDB (Motor Driver)| 3.3 / 4.6 | Async non-blocking NoSQL database for production scale |
| **Database (Fallback)**| File-Backed JSON Engine | Built-in | Custom transactional JSON engine guaranteeing 100% functionality without external database setup |
| **Testing Suite** | Pytest + Pytest-Asyncio| 8.0 / 0.23 | Automated test runner covering auth, scoring rubrics, and crisis keyword interception |
| **Containerization** | Docker & Compose | Multi-Stage | `node:20-slim` build stage + `python:3.11-slim` unified runtime |
| **Video Telehealth** | Jitsi Meet WebRTC | Free/Open | Browser-based video calling, no install. The counsellor provides the link, e.g. a Jitsi or Meet room |

---

## 4. System Architecture & Information Flow

### 4.1 Architecture Overview
- **Unified Micro-Monolith:** The vanilla-JS SPA is compiled by Vite into static bundles (`dist/`) and served directly by FastAPI under `/assets` and a root fallback route. In development, Vite provides hot-reloading on port 5173 with proxying to port 8000.
- **Dual Persistence:** The `DatabaseManager` dynamically inspects the `MONGODB_URL`. If present, it connects via `motor.motor_asyncio`. If missing or offline, it transparently routes queries through atomic JSON files stored in `backend/data/`.
- **Security & Authorization:** Cryptographic salting with `bcrypt` prevents credential leaks. Stateless JWT tokens ensure horizontal scalability with zero server-side session overhead.

---

## 5. Detailed Module Breakdown

### 5.1 AI Companion Engine (`app/services/ai_service.py`)
- **Safety Interception:** Real-time regex detection for crisis triggers (`suicide`, `kill myself`, `end my life`, `harm`, `die`). Bypasses normal dialog and triggers immediate escalation to Indian National Helplines:
  - **Tele-MANAS:** `14416` or `1800-891-4416` (24x7 Free Govt of India Helpline)
  - **KIRAN Mental Health:** `1800-599-0019`
- **Interactive CBT Exercises:**
  - *Box Breathing Module:* Guided 4-4-4-4 second count (Inhale, Hold, Exhale, Hold).
  - *5-4-3-2-1 Grounding Module:* Sensory somatic anchoring for acute panic attacks.
- **15+ Psychological Domains:** Academic burnout, procrastination, exam anxiety, impostor syndrome, relationship strain, sleep disruption, and loneliness.
- **Hinglish Understanding:** Matches colloquial student vocabulary (`padhai`, `neend nahi aa rahi`, `bohot darr lag raha hai`, `akela`, `thak gaya hoon`).
- **Cloud LLM Compatibility:** Extensible connector supporting Groq Cloud (Llama 3.3 70B) or OpenAI endpoints whenever an `AI_API_KEY` is provided.

### 5.2 Student Well-Being Screening (`app/routers/assessments.py`)
A guided, one-question-at-a-time screening made of **20 items** from published instruments plus a short student check-in:
- **PHQ-9 (9 items):** low mood and its related symptoms, including the item on thoughts of self-harm.
- **GAD-7 (7 items):** worry, restlessness, irritability and related anxiety symptoms.
- **Student check-in (4 items):** academic strain, sleep, social connection and overall load. This part is a Serenova addition and is **not** a validated scale.

Each item is answered 0 to 3 ("Not at all" to "Nearly every day"). Scores are kept per section (PHQ-9 0–27, GAD-7 0–21, check-in 0–12; maximum 60).

| Section | Bands used |
| :--- | :--- |
| PHQ-9 | 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe, 20–27 severe |
| GAD-7 | 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe |
| Check-in | low, some, high, very high strain |

The overall category is the worse of PHQ-9 and GAD-7, nudged up one level when student strain is very high. Any non-zero answer on the self-harm item raises a safety flag, which shows the helpline block immediately. The result is a **self-check to start a conversation, not a diagnosis.** The page itself has a gentle pace (progress ring, keyboard shortcuts 1–4, a short breathing break) and keeps progress in the browser if the student leaves.

### 5.3 Counsellor Directory & Booking (`app/routers/counsellors.py`, `appointments.py`)
- **Directory:** search, concern chips, language, fee and weekday filters, and sorting by soonest availability, fee or experience. Fees are shown before booking. Counsellors marked "Demo" are sample profiles only.
- **Profile drawer:** bio, concerns, languages, fee, weekly availability and what to expect.
- **Calendar booking in three steps:** a month calendar where only days with open times can be chosen (taken and past slots are greyed out), then the kind of support wanted and an optional note, then a review screen. Requests are confirmed by the counsellor.
- **No double booking:** `GET /api/counsellors/{id}/booked` returns only dates and times, with no student information. The server still rejects clashes.
- **My sessions:** upcoming and past, with status, cancel, and **Add to calendar** (`.ics` file that opens in Apple, Google and Outlook calendars).
- **Video link:** set by the counsellor and shown to the student only after the booking is confirmed. Serenova does not host or record calls, and does not claim end-to-end encryption.

### 5.4 Mood Tracking, Journal & Resources
- **Mood tracker:** five levels shown with real emojis that grow as the pointer nears (dock-style magnification), plus an optional note and a 7-day Chart.js curve.
- **Journal:** private to the account holder. Streak and week strip, a prompt of the day, ten gentle writing prompts, an emoji mood for each entry, tags, search and mood filters, a live word count, an on-device draft that restores if the page is closed, and a distraction-free Focus mode. The design is deliberately neutral and not gendered.
- **Resources:** 34 short guides across Academic Pressures, Rest & Recovery, Emotional Health, Friends & Family, Body & Habits and Verified Helplines. Each guide has its own photo. The page has search, topic chips, a featured guide, a quick-relief strip and a reader with previous / next.
- **Dashboard:** auto-changing hero photos, a one-minute breathing reset, guides picked for the day, and Hindi translations.

### 5.5 Personalised Companion (`app/services/personalised_companion.py`)
Replies use the student's own data, built fresh for each message: first name, the last 7 mood scores and trend, the tags they picked, the latest screening result and the next appointment. **Journal text is never used.** The rule-based engine uses this to pick and word its reply. When an LLM key is configured, the same summary is passed in as context.

---

## 6. Database Design & Schemas

Serenova stores documents in JSON/MongoDB with the following key models:
- **User:** `id`, `email`, `hashed_password`, `full_name`, `role`, `student_id`, `created_at`
- **Mood:** `id`, `user_id`, `score` (1-5), `emotion_label`, `notes`, `created_at`
- **Journal:** `id`, `user_id`, `title`, `content`, `sentiment`, `created_at`
- **Assessment:** `id`, `user_id`, `total_score` (0-60), `category`, `phq9_score`, `gad7_score`, `answers` (list of 20), `created_at`
- **Counsellor:** `id`, `name`, `title`, `specialisation`, `context`, `experience_years`, `languages`, `fee` (< ₹2000), `rating`, `video_meet_link`
- **Appointment:** `id`, `user_id`, `counsellor_id`, `date`, `time_slot`, `status`, `video_meet_link`
- **ChatSession & Message:** `id`, `user_id`, `sender` (user/assistant), `content`, `created_at`

---

## 7. Verification, Testing & Quality Assurance

### 7.1 Automated Tests
- **Backend (pytest, 47 tests):** accounts and roles, authentication, password reset, screening scoring, safety and crisis handling, counsellor portal, booking and booked-slot privacy, resources, admin statistics, and companion personalisation.
- **Frontend (`npm test`, 4 smoke tests):** routes, translations and build checks.
- **CI:** GitHub Actions runs both on every push.

Run them with `cd backend && python3 -m pytest -q` and `cd frontend && npm test`.

---

## 8. Deployment & DevOps Architecture

### 8.1 Multi-Stage Docker Build
- **Builder Stage:** Uses `node:20-slim` with `npm install` for architecture-independent Vite compilation.
- **Runtime Stage:** Uses `python:3.11-slim` with optimized pip caching, static frontend serving, and IPv4 loopback healthchecks (`http://127.0.0.1:8000/api/health`).

### 8.2 Production Deployment Readiness
- **Render.com / Railway.app:** Ready with `render.yaml` and multi-stage `Dockerfile`.
- **Docker Compose:** Ready with `docker compose up --build`.
- **Environment Variables:** Documented in `.env.example` with zero mandatory external API keys.

---

## 9. Future Roadmap & Enhancements

1. **End-to-End Encrypted Journaling:** Client-side AES-GCM-256 encryption.
2. **Wearable Integration:** Sleep cycle and resting heart rate monitoring via HealthKit/Health Connect.
3. **Anonymous Peer Circles:** Cohort-based peer support groups.
4. **Mobile App:** Packaging with Capacitor.js for native iOS/Android release.

---

## 10. Conclusion

Serenova provides an immediate, accessible, and culturally sensitive triage ecosystem that empowers students to take ownership of their mental wellness with dignity, privacy, and clinical efficacy.
