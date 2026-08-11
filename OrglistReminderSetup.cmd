@echo off
title Orglist Windows Reminder Setup
set "BASE_DIR=%~dp0"
set "REMINDER_SCRIPT=%~dp0orglist-reminder.py"
set "REGISTER_SCRIPT=%~dp0orglist-register-toast.ps1"
set "REMINDER_VBS=%~dp0orglist-reminder-start.vbs"

if not exist "%REMINDER_SCRIPT%" goto missing
if not exist "%REGISTER_SCRIPT%" goto missing
where py >nul 2>nul
if errorlevel 1 goto no_python

echo Registering the Orglist notification identity...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%REGISTER_SCRIPT%" -BaseDir "%BASE_DIR%"
if errorlevel 1 goto register_failed

if not exist "%~dp0orglist-reminder.pid" goto start_reminder
set /p REMINDER_PID=<"%~dp0orglist-reminder.pid"
taskkill /PID %REMINDER_PID% /F >nul 2>nul
if not errorlevel 1 del /Q "%~dp0orglist-reminder.pid" >nul 2>nul
:start_reminder
wscript.exe "%REMINDER_VBS%"

echo.
echo Orglist Reminder was installed and started successfully.
echo The default interval is 10 minutes and can be changed in Orglist settings.
echo.
pause
exit /b 0

:missing
echo Required reminder files are missing.
goto failed_pause

:no_python
echo Python 3 was not found. Install Python 3 with Add Python to PATH enabled.
goto failed_pause

:register_failed
echo Failed to register the Windows notification identity.
goto failed_pause

:failed_pause
echo.
pause
exit /b 1
