@echo off
echo PulseQueue Doctor Panel Starter
echo ================================

cd /d "%~dp0\doctor-panel"

echo [1] Installing npm dependencies...
call npm install

echo [2] Starting doctor panel on port 3002...
call npm run dev
