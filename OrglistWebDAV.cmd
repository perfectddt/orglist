@echo off
chcp 65001 >nul
title Org Checklist WebDAV Bridge
set "BRIDGE_SCRIPT=%~dp0org-webdav-bridge.py"
set "BRIDGE_LOG=%~dp0org-webdav-startup.log"
set "PYTHONUTF8=1"

echo [%date% %time%] Starting local WebDAV bridge.> "%BRIDGE_LOG%"
echo Script: %BRIDGE_SCRIPT%>> "%BRIDGE_LOG%"
echo.
echo Starting Org Checklist WebDAV bridge...
echo The browser will open automatically. Keep this window open.
echo If startup fails, this window will remain open and show the log.
echo.

where py >nul 2>nul
if errorlevel 1 goto try_python
echo Trying: py -3>> "%BRIDGE_LOG%"
py -3 -u "%BRIDGE_SCRIPT%" >> "%BRIDGE_LOG%" 2>&1
if %errorlevel%==0 goto success
echo py -3 failed with code %errorlevel%.>> "%BRIDGE_LOG%"

:try_python
where python >nul 2>nul
if errorlevel 1 goto no_python
echo Trying: python>> "%BRIDGE_LOG%"
python -u "%BRIDGE_SCRIPT%" >> "%BRIDGE_LOG%" 2>&1
if %errorlevel%==0 goto success
echo python failed with code %errorlevel%.>> "%BRIDGE_LOG%"
goto failed

:no_python
echo Neither py nor python was found.>> "%BRIDGE_LOG%"

:failed
echo.
echo WebDAV bridge failed to start.
echo ------------------------------------------------------------
type "%BRIDGE_LOG%"
echo ------------------------------------------------------------
echo Log file: %BRIDGE_LOG%
echo.
pause
exit /b 1

:success
exit /b 0
