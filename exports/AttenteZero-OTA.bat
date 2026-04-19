@echo off
REM ============================================================
REM  AttenteZero - OTA Update (rapide, sans build APK)
REM  Pousse les changements de code/data en 1-2 minutes
REM  Place ce .bat et le .ps1 dans le MEME dossier
REM ============================================================
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%AttenteZero-OTA.ps1"
pause
