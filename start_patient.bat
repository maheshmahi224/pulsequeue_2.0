@echo off
echo PulseQueue Patient Panel Starter
echo =================================

cd /d "%~dp0\patient-panel"

echo [1] Installing npm dependencies...
call npm install

echo [2] Starting patient panel on port 3001...
call npm run dev
