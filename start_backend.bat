@echo off
echo PulseQueue Backend Starter
echo ==========================

cd /d "%~dp0\backend"

echo [1] Installing Python dependencies...
pip install -r requirements.txt

echo [2] Seeding demo data...
python seed_data.py

echo [3] Starting FastAPI backend on port 8000...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
