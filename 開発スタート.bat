@echo off
cd /d "%~dp0"
echo Starting local development server...
start http://localhost:3000
npm run dev
pause
