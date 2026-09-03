@echo off
REM ============================================================
REM RoadSense_AI - Auto-Commit & Push Launcher
REM ============================================================
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0autocommit.ps1" %*
pause
