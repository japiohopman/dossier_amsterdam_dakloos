@echo off
title Dossier Amsterdam - lokale presentatie
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-lokaal.ps1"
if errorlevel 1 (
  echo.
  echo De lokale dossierwerkplek kon niet worden gestart.
  pause
)
