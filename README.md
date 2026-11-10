# Serenova: student mental-health support platform

A private web app for students (mood tracker, journal, PHQ-9/GAD-7 screening, a personalised AI companion, counsellor booking with a calendar, and 34 guides) with portals for counsellors and administrators.

- **Frontend:** vanilla JavaScript SPA, Vite, Chart.js. English and Hindi, light and dark themes, installable (PWA). Fonts are bundled, so no requests go to Google Fonts.
- **Backend:** FastAPI, JWT in an httpOnly cookie, bcrypt. MongoDB, or built-in JSON files for demos.
- **Safety:** helpline access on every page, crisis detection (English + Hinglish) that logs only *that* it happened, AI replies checked before display.
- **Privacy:** consent screen, data export, account deletion, anonymous admin statistics.

## Run locally

```bash
# backend (terminal 1)
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip3 install -r requirements.txt && python3 -m uvicorn app.main:app --port 8000   # add --reload while developing

# frontend (terminal 2)
cd frontend && npm install && npm run dev        # http://localhost:5173
```

Demo logins (demo mode only; password `password123`): `student@university.edu`, `ananya.sen@serenova.demo` (counsellor), `admin@serenova.demo`.

## Photos

Guide, dashboard and landing photos come from Unsplash (`frontend/src/assets/images.js`). If a photo fails to load, a soft gradient is shown instead. To change one, replace its `id` there, keeping the key the same.

## Tests

```bash
cd backend && pip install pytest pytest-asyncio && python3 -m pytest -q
cd frontend && npm test
```

Configuration is in `.env.example`; see `DEPLOYMENT.md` for the go-live checklist.

*Serenova is a support tool, not a medical or emergency service.*
