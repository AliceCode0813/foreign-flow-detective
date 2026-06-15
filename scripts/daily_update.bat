@echo off
setlocal
cd /d "%~dp0.."

set "PATH=C:\Program Files\nodejs;%PATH%"

echo [%date% %time%] daily_update 시작 >> logs\daily_update.log
py scripts\daily_update.py >> logs\daily_update.log 2>&1
echo [%date% %time%] daily_update 종료 (exit %ERRORLEVEL%) >> logs\daily_update.log

endlocal
exit /b %ERRORLEVEL%
