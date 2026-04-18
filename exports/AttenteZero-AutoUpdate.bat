@echo off
REM ============================================================
REM  AttenteZero - Lanceur double-clic
REM  Place ce .bat et le .ps1 dans le MEME dossier (ex: Bureau)
REM ============================================================
setlocal
set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%AttenteZero-AutoUpdate.ps1"
pause
