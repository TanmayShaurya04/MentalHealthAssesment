# Serenova

**A private mental-health support platform for university students, with portals for counsellors and administrators.**

Students can track mood, journal, take validated screenings (PHQ-9 / GAD-7), talk to a personalised companion, read 34 self-help guides and book counsellor appointments. Counsellors manage their own schedule; admins see anonymous, aggregate statistics only.

> Serenova is a support tool, **not** a medical or emergency service. Helpline access is shown on every page.

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Mood-aware hero, daily breathing reset, "picked for you" reads, streaks |
| **Mood check-in** | Emoji mood picker with dock-style magnification, history charts (Chart.js) |
| **Journal** | Streak + week strip, prompt of the day, mood-tinted cards, auto-saved drafts, focus mode |
| **Screening** | 20 items: PHQ-9 + GAD-7 + 4-item student check-in, scored with severity bands |
| **Companion** | Rule-based, personalised from mood and screening trends (never reads journal text); optional LLM provider |
| **Resources** | 34 guides across themed categories, featured and quick reads, one photo per guide |
| **Counsellors** | Profiles, calendar booking with live slot availability, `.ics` export, email confirmations and reminders |
| **Portals** | Counsellor portal (appointments, availability) and admin insights (anonymous aggregates, counsellor logins) |
| **Safety** | Crisis detection (English + Hinglish) that logs only *that* it happened; AI replies checked before display |
| **Privacy** | Consent screen, data export, account deletion, minimum group size on admin stats |
| **Platform** | English / Hindi, light / dark theme, installable PWA, self-hosted fonts, strict CSP |

## Architecture

```
┌──────────────────────────┐   HTTPS / JSON    ┌─────────────────────────────┐
│  Browser (SPA, Vite)     │ ────────────────► │  FastAPI  (backend/app)     │
│  router → pages          │   httpOnly JWT    │  routers → services → DB    │
│  components, api/, store │ ◄──────────────── │  auth, rate limit, safety   │
└──────────────────────────┘                   └──────────────┬──────────────┘
                                                              │
                                      MongoDB  ◄── or ──►  JSON files (demo)
```

In production the FastAPI app also serves the built frontend, so one container exposes everything on a single port. A two-tier deployment (Vercel + Render) is also supported; see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Request flow: `pages/*` call `api/*` (fetch wrapper in `api/client.js`) → `routers/*` validate with Pydantic models and role checks → `services/*` hold business logic (companion, safety, appointment rules, email, reminders) → `database.py` (Mongo or JSON-file collections).

## Project structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              App factory, CSP/security headers, static SPA serving
│   │   ├── config.py            Settings from environment
│   │   ├── auth.py              Password hashing, JWT cookie, role guards
│   │   ├── database.py          MongoDB / JSON-file collections
│   │   ├── models.py            Pydantic request/response models
│   │   ├── seed_data.py         Demo users, counsellors, resources (idempotent)
│   │   ├── routers/             HTTP endpoints, one file per domain
│   │   └── services/            Companion, safety layer, topic classifier,
│   │                            appointment rules, email, reminders, rate limiting
│   ├── data/resources.json      The 34 guides
│   ├── tests/                   pytest suite (47 tests)
│   ├── Dockerfile  Procfile     Backend-only deploys
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.js              Entry: fonts, styles, router boot
│   │   ├── router.js  navigation.js  store.js
│   │   ├── pages/               One module per screen
│   │   ├── components/          Navbar, Footer, Dialog, Toast, ConsentModal, icons
│   │   ├── api/                 Fetch wrappers per backend domain
│   │   ├── i18n/                en.js, hi.js
│   │   ├── utils/               emojiDock, ics, theme, animations, journalPrompts, html
│   │   ├── assets/images.js     Photo catalogue (Unsplash IDs)
│   │   └── styles/              tokens.css (design tokens + dark theme) and page CSS
│   ├── scripts/check-photos.mjs Verifies every photo ID resolves
│   ├── tests/smoke.test.mjs
│   └── vercel.json
├── docs/                        Deployment guide, project plan, project report
├── .github/workflows/ci.yml     Backend tests + frontend build/tests
├── Dockerfile  docker-compose.yml  render.yaml  Procfile   Full-stack deploy
└── .env.example                 All configuration options
```

## Tech stack

- **Frontend:** vanilla JavaScript (ES modules), Vite 5, Chart.js, CSS custom properties
- **Backend:** Python 3, FastAPI, Pydantic v2, bcrypt, PyJWT
- **Storage:** MongoDB (production) or JSON files (demo)
- **Tooling:** pytest + pytest-asyncio, Node test runner, GitHub Actions, Docker

## Getting started (macOS)

Prerequisites: Python 3.10+, Node 18+.

```bash
# Terminal 1: backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip3 install -r requirements.txt
python3 -m uvicorn app.main:app --port 8000      # add --reload while developing

# Terminal 2: frontend
cd frontend
npm install
npm run dev                                       # http://localhost:5173
```

Demo logins (demo mode only; password `password123`):

| Role | Email |
|---|---|
| Student | `student@university.edu` |
| Counsellor | `ananya.sen@serenova.demo` |
| Admin | `admin@serenova.demo` |

## Configuration

Copy `.env.example` to `.env`. Key variables:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Required in production; the app refuses to start with the default |
| `MONGODB_URL`, `DATABASE_NAME` | Use MongoDB instead of JSON files |
| `DEMO_MODE`, `DEMO_PASSWORD` | Seed demo accounts (set `DEMO_MODE=false` for production) |
| `CORS_ORIGINS`, `PUBLIC_URL`, `COOKIE_SECURE`, `COOKIE_SAMESITE` | Web/cookie security |
| `SMTP_*`, `REMINDERS_ENABLED` | Real confirmation and reminder emails |
| `AI_PROVIDER`, `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY` | Optional LLM; offline companion is used when empty |
| `SENTRY_DSN` | Optional error tracking |

## Testing

```bash
cd backend  && pip3 install pytest pytest-asyncio && python3 -m pytest -q
cd frontend && npm test && npm run build
cd frontend && npm run check:photos    # needs internet; lists broken photo IDs
```

CI runs the same checks on every push.

## Photos

Photos come from Unsplash via `frontend/src/assets/images.js`. If one fails to load a soft gradient is shown. To replace one, change its `id` and keep the key.

## Deployment

Render, Railway, Docker/VPS and Vercel + Render are covered in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), including the go-live checklist (real SMTP, real counsellors, MongoDB, HTTPS, reviewed legal text).

## Further reading

- [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md): planning and scope
- [docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md): full project report
- [docs/miniprojectrest.pdf](docs/miniprojectrest.pdf): project submission

## Safety and privacy notes

- Journal text is never read by the companion or logged by the safety layer.
- Admin statistics are aggregate and suppressed below a minimum group size.
- Before launch: replace placeholder contact details in the Privacy Policy and Terms and have them legally reviewed.
