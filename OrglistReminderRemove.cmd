@echo off
title Remove Orglist Windows Reminder
set "PID_FILE=%~dp0orglist-reminder.pid"
if not exist "%PID_FILE%" goto no_running_helper
set /p REMINDER_PID=<"%PID_FILE%"
taskkill /PID %REMINDER_PID% /F >nul 2>nul
del /Q "%PID_FILE%" >nul 2>nul
:no_running_helper
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0orglist-unregister-toast.ps1"
echo.
echo Orglist Reminder was removed. Configuration and reminder history were kept.
echo.
pause
