@echo off
echo ============================================
echo   YouTube Downloader - Starting Application
echo ============================================
echo.

echo [1/2] Starting Backend Server...
cd server
start "Backend - YouTube Downloader" cmd /k "npm run dev"
echo     Backend starting on http://localhost:5000
echo.

echo [2/2] Waiting 5 seconds for backend to initialize...
timeout /t 5 /nobreak > nul

echo     Starting Frontend Server...
cd ..\client
start "Frontend - YouTube Downloader" cmd /k "npm run dev"
echo     Frontend starting on http://localhost:3000
echo.

echo ============================================
echo   Both servers are starting!
echo ============================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Wait for both windows to show "ready" messages
echo   Then open http://localhost:3000 in your browser
echo.
echo ============================================
pause
