@echo off
cd /d "%~dp0"
echo Building application for production...
npm run build
echo Build completed.
pause
