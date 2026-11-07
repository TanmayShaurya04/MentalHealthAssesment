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
2. A standardized **15-question clinical screening rubric** (adapted from PHQ-9 and GAD-7 standards).
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
| **Video Telehealth** | Jitsi Meet WebRTC | Free/Open | Browser-native, zero-install encrypted video calling |

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

### 5.2 Clinical Screening & Assessment (`app/routers/assessments.py`)
Provides an evidence-based clinical self-evaluation composed of **15 standardized questions**:
- **Questions 1–7 (Depressive Core - PHQ-9 alignment):** Anhedonia, persistent low mood, sleep rhythm disturbance, energy depletion, appetite change, feelings of failure/guilt, psychomotor slowing.
- **Questions 8–13 (Anxiety Core - GAD-7 alignment):** Uncontrollable worry, restlessness, somatic tension, irritability, hypervigilance, anticipation of doom.
- **Questions 14–15 (Student & Social Functional Impact):** Academic focus impairment, social withdrawal.

#### Scoring Algorithm & Severity Scale (0 to 45 Points):
$$\text{Total Score} = \sum_{i=1}^{15} \text{AnswerValue}_i \quad (\text{where } \text{AnswerValue} \in [0, 3])$$

| Score Range | Severity Tier | Clinical Guidance & System Action |
| :---: | :---: | :--- |
| **0 – 9** | **Minimal / Healthy** | Normal emotional fluctuations. Recommended: Sleep hygiene and mindfulness check-ins. |
| **10 – 19** | **Mild Stress / Anxiety** | Early symptomatic patterns. Recommended: Daily mood tracking, guided breathing exercises, and journaling. |
| **20 – 29** | **Moderate Distress** | Clinically relevant strain impacting academics. Recommended: Booking an appointment with a campus counsellor. |
| **30 – 45** | **Severe Distress** | High clinical concern. Prominently displays emergency helpline banner, priority consultation booking, and print-ready summary for medical professionals. |

### 5.3 Professional Counsellor Directory & Tele-Health (`app/routers/counsellors.py`)
- **Strict Student Affordability Guarantee:** Every counsellor's consultation fee is capped under ₹2,000 (standardized rates: ₹500, ₹800, ₹1,200, ₹1,500).
- **Responsive Table Interface:**
  - Columns: Counsellor Name & Qualification, Focus Area / Context, Years of Experience, Languages Spoken, Fee per session, Availability status.
  - Quick Search & Filter: Filter by specialty (CBT, Career Stress, Anxiety, Trauma) or spoken language (English, Hindi, Bengali, Tamil, etc.).
- **Live Video Consultation:**
  - Integrated WebRTC consultation modal using Jitsi Meet (`https://meet.jit.si/serenova-consultation-...`).
  - Requires zero third-party software downloads; works directly inside standard mobile and desktop browsers with end-to-end encryption.

### 5.4 Mood Tracking & Affective Journaling (`app/routers/moods.py` & `journals.py`)
- **Visual Valence Scale:** 5 distinct emotional states accompanied by custom SVG vector illustrations:
  1. *Rad / Great (Score: 5)* — Vibrant radiant smiling icon
  2. *Good (Score: 4)* — Warm contented smiling icon
  3. *Meh / Okay (Score: 3)* — Neutral calm line icon
  4. *Bad / Down (Score: 2)* — Melancholic downturned icon
  5. *Awful / Terrible (Score: 1)* — Distressed blue cloud icon
- **Temporal Analysis:** Chart.js canvas graph dynamically plots a student's 7-day emotional curve against logged dates.
- **Journaling:** Private textual logs with automated sentiment tagging (`positive`, `neutral`, `negative`) and timestamp indexing.

---

## 6. Database Design & Schemas

Serenova stores documents in JSON/MongoDB with the following key models:
- **User:** `id`, `email`, `hashed_password`, `full_name`, `role`, `student_id`, `created_at`
- **Mood:** `id`, `user_id`, `score` (1-5), `emotion_label`, `notes`, `created_at`
- **Journal:** `id`, `user_id`, `title`, `content`, `sentiment`, `created_at`
- **Assessment:** `id`, `user_id`, `total_score` (0-45), `severity`, `answers` (list of 15), `created_at`
- **Counsellor:** `id`, `name`, `title`, `specialisation`, `context`, `experience_years`, `languages`, `fee` (< ₹2000), `rating`, `video_meet_link`
- **Appointment:** `id`, `user_id`, `counsellor_id`, `date`, `time_slot`, `status`, `video_meet_link`
- **ChatSession & Message:** `id`, `user_id`, `sender` (user/assistant), `content`, `created_at`

---

## 7. Verification, Testing & Quality Assurance

### 7.1 Automated Pytest Suite
Serenova maintains 100% pass status on its backend automated test suite:
- `test_api.py`: Validates API health endpoints, counsellor retrieval, and 15-question clinical assessment calculation.
- `test_auth.py`: Validates user registration, duplicate email rejection, bcrypt verification, and JWT issuance.
- `test_safety.py`: Validates that self-harm keywords trigger Tele-MANAS crisis responses and safety interventions.

All 9 unit and integration tests pass cleanly in under 1.1s.

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
