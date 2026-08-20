@echo off
setlocal
title Orglist Mobile Preview
set "PREVIEW_SCRIPT=%~dp0..\work\orglist-mobile-preview.py"

where py.exe >nul 2>nul
if errorlevel 1 goto try_python
py.exe -3 "%PREVIEW_SCRIPT%"
if errorlevel 1 goto failed
goto done

:try_python
where python.exe >nul 2>nul
if errorlevel 1 goto no_python
python.exe "%PREVIEW_SCRIPT%"
if errorlevel 1 goto failed
goto done

:no_python
echo Python 3 was not found.
goto failed

:failed
echo.
echo Orglist mobile preview failed. See the message above.
pause
exit /b 1

:done
endlocal
