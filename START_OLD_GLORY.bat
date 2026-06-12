@echo off
setlocal

title Old Glory Warehouse
cd /d "%~dp0"

set "NODE_HOME=C:\Program Files\nodejs"
set "NPM=%NODE_HOME%\npm.cmd"

echo.
echo ==========================================
echo   Old Glory Warehouse
echo ==========================================
echo.
echo This window runs the Old Glory local server.
echo Keep it open while using the app.
echo.

if not exist "%NPM%" (
  echo Node.js was not found at "%NODE_HOME%".
  echo Please install Node.js LTS, then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\next\dist\bin\next" (
  echo Installing project dependencies. This can take a few minutes.
  call "%NPM%" install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo Dependency install failed.
    pause
    exit /b 1
  )
)

echo Starting Old Glory on http://localhost:3100
echo CBS FieldOps can continue using http://localhost:3000
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; Start-Process 'http://localhost:3100'"
call "%NPM%" run dev

echo.
echo Old Glory server stopped.
pause
