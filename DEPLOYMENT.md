# 🚀 Serenova Deployment Guide

Serenova is architected to run either as a **unified full-stack service** (FastAPI serving both API and the pre-built SPA frontend on a single port) or as a **two-tier deployment** (Vercel frontend + Render backend).

---

## 🌟 Option 1: 1-Click Free Deployment on Render.com (Recommended)

Render provides a free tier with automatic HTTPS and Docker support.

### Steps:
1. Push your latest code to GitHub:
   ```bash
   git add .
   git commit -m "Add production deployment configurations"
   git push origin main
   ```
2. Log in to [Render.com](https://render.com/) and click **New +** → **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your `Serenova` repo.
4. Render will automatically detect the `Dockerfile` and `render.yaml`:
   - **Environment:** `Docker`
   - **Branch:** `main`
   - **Plan:** `Free`
5. Click **Create Web Service**.
6. In 2-3 minutes, Render will build your frontend, configure Python, and give you a live HTTPS URL:
   👉 `https://serenova-xxxx.onrender.com`

---

## 🚂 Option 2: Railway.app (Zero-Config)

1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **New Project** → **Deploy from GitHub repo**.
3. Select `Serenova`.
4. Railway will automatically pick up the root `Dockerfile`.
5. Under service settings, click **Generate Domain**.
6. Your app is live!

---

## 🐳 Option 3: Local or VPS Docker Deployment

You can build and run the production container locally or on any cloud VPS (DigitalOcean, AWS EC2, GCP Compute):

```bash
# Clone the repository
git clone https://github.com/TanmayShaurya04/Serenova.git
cd Serenova

# Build & run with Docker Compose
docker compose up --build -d
```

Visit `http://localhost:8000` to access the production app.

---

## ⚡ Option 4: Two-Tier (Vercel Frontend + Render Backend)

If you prefer hosting the frontend on Vercel and the backend on Render/Railway:

### 1. Deploy Backend:
- In Render or Railway, set Root Directory to `backend`.
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Copy your backend URL (e.g., `https://serenova-api.onrender.com`).

### 2. Deploy Frontend on Vercel:
- In [Vercel](https://vercel.com/), import your repo and set:
  - **Root Directory:** `frontend`
  - **Framework Preset:** `Vite`
  - **Build Command:** `npm run build`
  - **Output Directory:** `dist`
  - **Environment Variable:** `VITE_API_BASE_URL` = `https://serenova-api.onrender.com`
- Click **Deploy**.

---

## 🔒 Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | Auto | `8000` | Port for the web server (assigned by cloud host) |
| `ENVIRONMENT` | No | `production` | Runtime mode (`production` or `development`) |
| `JWT_SECRET` | **Required in production** | Random 48+ chars | Signs sessions. The app refuses to start in production with the default value |
| `MONGODB_URL` | Optional | *Empty* | Connection string for MongoDB Atlas. If omitted, uses fast file-backed storage (`data/`). |
| `AI_API_KEY` | Optional | *Empty* | Groq/OpenAI key. If omitted, uses the comprehensive offline Rule-Based Companion engine. |

## Going live checklist

1. Copy `.env.example` to `.env`; set `JWT_SECRET`, `PUBLIC_URL`, `CORS_ORIGINS`, `DEMO_MODE=false`.
2. Use MongoDB (`MONGODB_URL`, e.g. a free Atlas cluster). The JSON-file storage is for demos only.
3. Add SMTP settings so password-reset, confirmation, booking and reminder emails are really sent.
4. Create real counsellor profiles and logins (Admin page → Counsellor logins). Demo profiles are labelled "Demo".
5. Serve over HTTPS and keep `COOKIE_SECURE=true`.
6. Replace the placeholder contact details in the Privacy Policy and Terms and have them reviewed.
7. Optional: set `SENTRY_DSN` (`pip install sentry-sdk`) for error tracking.
