@echo off
echo Starting Backend Server...
cd server
start "YouTube Downloader Backend" cmd /k "npm run dev"
echo Backend server starting in new window...
echo Wait for "Server running on port 5000" message
pause
