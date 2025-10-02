@echo off
echo Starting Frontend Server...
cd client
start "YouTube Downloader Frontend" cmd /k "npm run dev"
echo Frontend server starting in new window...
echo Application will open at http://localhost:3000
pause
