@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  YT-Downloader -- One-Click Setup and Launcher  
::  Supports: Windows 10 / 11 (x64)
::  Auto-installs: Node.js (via winget), yt-dlp, ffmpeg
:: ============================================================

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "BIN_DIR=%ROOT%\bin"
set "SERVER_DIR=%ROOT%\server"
set "CLIENT_DIR=%ROOT%\client"
set "YTDLP_EXE=%BIN_DIR%\yt-dlp.exe"
set "FFMPEG_EXE=%BIN_DIR%\ffmpeg.exe"
set "YTDLP_URL=https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
set "FFMPEG_ZIP_URL=https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
set "FFMPEG_ZIP=%BIN_DIR%\ffmpeg-win64.zip"

cls
echo.
echo  ============================================================
echo   YT-Downloader -- One-Click Setup and Launcher 
echo  ============================================================
echo.

:: ---- STEP 1 -- Verify / Auto-Install Node.js ----------------
echo [STEP 1/7] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 goto :node_missing

for /f "tokens=1 delims=." %%M in ('node -v 2^>nul') do set "_node_major=%%M"
set "_node_major=%_node_major:v=%"
if %_node_major% LSS 18 (
    echo   [WARN] Node.js v%_node_major% is below the required v18.
    echo   [....] Attempting upgrade via winget...
    goto :node_install
)
echo   [OK] Node.js v%_node_major% found.
goto :node_ok

:node_missing
echo   [WARN] Node.js not found on this machine.
echo   [....] Attempting automatic install via winget...

:node_install
where winget >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERR] winget is not available on this machine.
    echo   [ERR] Please install Node.js 18+ manually from: https://nodejs.org/
    echo   [ERR] Then re-run this script.
    goto :fatal
)
winget install --id OpenJS.NodeJS.LTS --exact --accept-source-agreements --accept-package-agreements --silent
if %errorlevel% neq 0 (
    echo   [ERR] winget failed to install Node.js automatically.
    echo   [ERR] Please install Node.js 18+ manually from: https://nodejs.org/
    goto :fatal
)
echo   [OK] Node.js installed successfully via winget.
echo   [!!] Refreshing PATH from registry...
for /f "usebackq tokens=2,*" %%A in (`reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul`) do set "SYS_PATH=%%B"
for /f "usebackq tokens=2,*" %%A in (`reg query "HKCU\Environment" /v PATH 2^>nul`) do set "USR_PATH=%%B"
set "PATH=%SYS_PATH%;%USR_PATH%"
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERR] Node.js still not found after install. Please restart this script.
    goto :fatal
)

:node_ok
for /f "tokens=1 delims=." %%M in ('node -v 2^>nul') do set "_node_major=%%M"
set "_node_major=%_node_major:v=%"
echo   [OK] Using Node.js v%_node_major%

:: ---- STEP 2 -- Verify npm -----------------------------------
echo [STEP 2/7] Checking npm...
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERR] npm not found even though Node.js is installed.
    echo   [ERR] Please reinstall Node.js from https://nodejs.org/
    goto :fatal
)
for /f %%N in ('npm -v 2^>nul') do set "_npm_ver=%%N"
echo   [OK] npm v%_npm_ver% found.

:: ---- STEP 3 -- Download / update yt-dlp --------------------
echo [STEP 3/7] Setting up yt-dlp...
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"
if exist "%YTDLP_EXE%" goto :ytdlp_update

echo   [..] Downloading yt-dlp.exe from GitHub...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%YTDLP_URL%' -OutFile '%YTDLP_EXE%' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo   [ERR] Failed to download yt-dlp. Check your internet connection.
    goto :fatal
)
echo   [OK] yt-dlp downloaded successfully.
goto :ytdlp_check

:ytdlp_update
echo   [..] yt-dlp already present. Attempting self-update...
"%YTDLP_EXE%" -U >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] yt-dlp is up-to-date.
) else (
    echo   [!!] yt-dlp self-update skipped. Using existing binary.
)

:ytdlp_check
"%YTDLP_EXE%" --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERR] yt-dlp executable appears broken. Deleting -- re-run the script.
    del /f /q "%YTDLP_EXE%" >nul 2>&1
    goto :fatal
)
echo   [OK] yt-dlp is ready.

:: ---- STEP 4 -- Download ffmpeg ------------------------------
echo [STEP 4/7] Setting up ffmpeg...
if exist "%FFMPEG_EXE%" (
    echo   [OK] ffmpeg already present. Skipping download.
    goto :ffmpeg_done
)

echo   [..] Downloading ffmpeg (approx 80 MB, please wait)...
powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri '%FFMPEG_ZIP_URL%' -OutFile '%FFMPEG_ZIP%' -UseBasicParsing"
if %errorlevel% neq 0 (
    echo   [!!] Failed to download ffmpeg. Audio/video merging will be disabled.
    goto :ffmpeg_done
)

echo   [..] Extracting ffmpeg binaries...
powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[System.IO.Compression.ZipFile]::OpenRead('%FFMPEG_ZIP%'); foreach($e in $z.Entries){ if($e.Name -in 'ffmpeg.exe','ffprobe.exe','ffplay.exe'){ [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e,[IO.Path]::Combine('%BIN_DIR%',$e.Name),$true) } }; $z.Dispose()"
if exist "%FFMPEG_EXE%" (
    echo   [OK] ffmpeg extracted successfully.
) else (
    echo   [!!] ffmpeg extraction failed. Audio/video merging may be unavailable.
)
if exist "%FFMPEG_ZIP%" del /f /q "%FFMPEG_ZIP%" >nul 2>&1

:ffmpeg_done

:: ---- STEP 5 -- Install server npm dependencies --------------
echo [STEP 5/7] Installing server dependencies...
cd /d "%SERVER_DIR%"
echo   [..] Running npm install in server\ ...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo   [ERR] npm install failed for the server.
    echo   [ERR] Check your internet connection or proxy settings.
    goto :fatal
)
echo   [OK] Server dependencies are up-to-date.

:: ---- STEP 6 -- Install client npm dependencies --------------
echo [STEP 6/7] Installing client dependencies...
cd /d "%CLIENT_DIR%"
echo   [..] Running npm install in client\ ...
call npm install --no-audit --no-fund
if %errorlevel% neq 0 (
    echo   [ERR] npm install failed for the client.
    echo   [ERR] Check your internet connection or proxy settings.
    goto :fatal
)
echo   [OK] Client dependencies are up-to-date.

:: ---- STEP 7 -- Scaffold .env files and patch tool paths -----
echo [STEP 7/7] Configuring environment files...

if exist "%SERVER_DIR%\.env" (
    echo   [OK] server\.env already exists -- skipping creation.
    goto :server_env_done
)
if exist "%SERVER_DIR%\.env.example" (
    copy /y "%SERVER_DIR%\.env.example" "%SERVER_DIR%\.env" >nul
    echo   [OK] Created server\.env from .env.example
    goto :server_env_done
)
(
    echo NODE_ENV=development
    echo PORT=5000
    echo CORS_ORIGIN=http://localhost:3000
    echo REQUIRE_AUTH=false
    echo API_KEYS=
    echo YTDLP_PATH=yt-dlp
    echo FFMPEG_PATH=
    echo TEMP_PATH=./temp
    echo FILE_RETENTION_HOURS=1
    echo MAX_CONCURRENT_DOWNLOADS=3
    echo MAX_QUEUE_SIZE=20
    echo QUEUE_TIMEOUT_MS=300000
    echo DOWNLOAD_TIMEOUT_MS=300000
    echo RATE_LIMIT_WINDOW_MS=60000
    echo RATE_LIMIT_MAX_REQUESTS=30
    echo DOWNLOAD_RATE_LIMIT_MAX=10
    echo STREAM_RATE_LIMIT_MAX=5
    echo STREAM_RATE_LIMIT_WINDOW=300000
    echo LOG_LEVEL=info
    echo LOG_FILE_PATH=./logs
) > "%SERVER_DIR%\.env"
echo   [OK] Created server\.env with safe defaults.

:server_env_done

if exist "%CLIENT_DIR%\.env" (
    echo   [OK] client\.env already exists -- skipping creation.
    goto :client_env_done
)
if exist "%CLIENT_DIR%\.env.example" (
    copy /y "%CLIENT_DIR%\.env.example" "%CLIENT_DIR%\.env" >nul
    echo   [OK] Created client\.env from .env.example
    goto :client_env_done
)
echo VITE_API_URL=http://localhost:5000 > "%CLIENT_DIR%\.env"
echo   [OK] Created client\.env with safe defaults.

:client_env_done

:: Auto-generate API key and patch both .env files (only if placeholders still present)
powershell -NoProfile -Command "$sf='%SERVER_DIR%\.env'; $cf='%CLIENT_DIR%\.env'; $sl=Get-Content $sf -Raw; if ($sl -match 'API_KEYS=your_api_key' -or ($sl -match 'API_KEYS=\s*[\r\n]')) { $key=([System.BitConverter]::ToString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) -replace '-','').ToLower(); $sl2=Get-Content $sf; $sl2=$sl2|ForEach-Object{ if($_ -match '^API_KEYS='){'API_KEYS='+$key} elseif($_ -match '^REQUIRE_AUTH='){'REQUIRE_AUTH=false'} else{$_} }; Set-Content $sf $sl2; $cl2=Get-Content $cf; $cl2=$cl2|ForEach-Object{ if($_ -match '^VITE_API_KEY='){'VITE_API_KEY='+$key} else{$_} }; Set-Content $cf $cl2; Write-Host '  [OK] Generated and applied a new API key to both .env files.' } else { Write-Host '  [OK] API key already configured -- skipping generation.' }"

:: Patch YTDLP_PATH in server\.env
powershell -NoProfile -Command "$f='%SERVER_DIR%\.env'; $p='%YTDLP_EXE%'; $l=Get-Content $f; $ok=$false; $l=$l|ForEach-Object{ if($_ -match '^YTDLP_PATH='){'YTDLP_PATH='+$p; $ok=$true}else{$_} }; if(-not $ok){$l+='YTDLP_PATH='+$p}; Set-Content $f $l"
echo   [OK] YTDLP_PATH set to: %YTDLP_EXE%

if not exist "%FFMPEG_EXE%" goto :skip_ffmpeg_patch
powershell -NoProfile -Command "$f='%SERVER_DIR%\.env'; $p='%FFMPEG_EXE%'; $l=Get-Content $f; $ok=$false; $l=$l|ForEach-Object{ if($_ -match '^FFMPEG_PATH='){'FFMPEG_PATH='+$p; $ok=$true}else{$_} }; if(-not $ok){$l+='FFMPEG_PATH='+$p}; Set-Content $f $l"
echo   [OK] FFMPEG_PATH set to: %FFMPEG_EXE%

:skip_ffmpeg_patch

echo.
echo  ============================================================
echo   All dependencies ready. Launching servers...
echo  ============================================================
echo.

echo   [..] Starting Backend on http://localhost:5000 ...
start "YT-Downloader [Backend :5000]" cmd /k "title YT-Downloader [Backend :5000] && cd /d "%SERVER_DIR%" && npm run dev"

echo   [..] Waiting 6 s for backend to initialize...
timeout /t 6 /nobreak >nul

echo   [..] Starting Frontend on http://localhost:3000 ...
start "YT-Downloader [Frontend :3000]" cmd /k "title YT-Downloader [Frontend :3000] && cd /d "%CLIENT_DIR%" && npm run dev"

timeout /t 4 /nobreak >nul
echo   [..] Opening browser...
start "" "http://localhost:3000"

echo.
echo  ============================================================
echo   YT-Downloader is running!
echo     Backend   ^>  http://localhost:5000
echo     Frontend  ^>  http://localhost:3000
echo   Close the two terminal windows to stop the servers.
echo  ============================================================
echo.
pause
goto :eof

:fatal
echo.
echo  ============================================================
echo   [FATAL] Setup failed. Resolve the error above and re-run.
echo  ============================================================
echo.
pause
exit /b 1