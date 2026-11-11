#!/usr/bin/env bash
# Starts Serenova locally: backend on :8000 and frontend on :5173. Stop with Ctrl+C.
set -e
cd "$(dirname "$0")"

echo "▶ Setting up backend…"
cd backend
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
python3 -m uvicorn app.main:app --port 8000 &
BACK=$!
cd ..

echo "▶ Setting up frontend…"
cd frontend
[ -d node_modules ] || npm install
trap 'kill $BACK 2>/dev/null' EXIT INT TERM
echo ""
echo "✅ Open http://localhost:5173   (login: student@university.edu / password123)"
echo ""
npm run dev
