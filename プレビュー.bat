@echo off
cd /d "%~dp0"
echo Starting production preview server...
start http://localhost:4173
npm run preview
pause
