@echo off
title Org Checklist Mobile WebDAV Bridge
set "BRIDGE_SCRIPT=%~dp0org-webdav-bridge.py"
set "BRIDGE_LOG=%~dp0org-webdav-mobile-startup.log"
set "PYTHONUTF8=1"
set "ORG_WEBDAV_LAN=1"

echo [%date% %time%] Starting mobile WebDAV bridge.> "%BRIDGE_LOG%"
echo Script: %BRIDGE_SCRIPT%>> "%BRIDGE_LOG%"
echo.
echo Starting the Orglist LAN folder bridge...
echo Keep this window and the computer browser page open.
echo Step 1: On the computer page, click Open Org Folder and grant access.
echo Step 2: On the phone, open the Phone URL printed below.
echo A wired computer and a Wi-Fi phone can use the same router.
echo.

where py >nul 2>nul
if errorlevel 1 goto try_python
echo Trying: py -3>> "%BRIDGE_LOG%"
py -3 -u "%BRIDGE_SCRIPT%"
if %errorlevel%==0 goto success
echo py -3 failed with code %errorlevel%.>> "%BRIDGE_LOG%"

:try_python
where python >nul 2>nul
if errorlevel 1 goto no_python
echo Trying: python>> "%BRIDGE_LOG%"
python -u "%BRIDGE_SCRIPT%"
if %errorlevel%==0 goto success
echo python failed with code %errorlevel%.>> "%BRIDGE_LOG%"
goto failed

:no_python
echo Neither py nor python was found.>> "%BRIDGE_LOG%"

:failed
echo.
echo Mobile WebDAV bridge failed to start.
echo ------------------------------------------------------------
type "%BRIDGE_LOG%"
echo ------------------------------------------------------------
echo Log file: %BRIDGE_LOG%
echo.
pause
exit /b 1

:success
exit /b 0
