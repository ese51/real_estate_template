@echo off
setlocal

set "REPO_DIR=D:\RealEstateTemplate"

echo.
echo ========================================
echo Real Estate Template Launcher
echo ========================================
echo.

echo [1/6] Switching to repo directory...
cd /d "%REPO_DIR%"
if errorlevel 1 (
  echo ERROR: Could not change directory to "%REPO_DIR%".
  goto :fail
)

echo.
echo [2/6] Pulling latest from origin main...
git pull origin main
if errorlevel 1 (
  echo ERROR: git pull origin main failed.
  goto :fail
)

echo.
echo [3/6] Switching into app directory...
cd /d "%REPO_DIR%\app"
if errorlevel 1 (
  echo ERROR: Could not change directory to "%REPO_DIR%\app".
  goto :fail
)

echo.
echo [4/6] Installing npm dependencies...
call npm install
if errorlevel 1 (
  echo ERROR: npm install failed.
  goto :fail
)

echo.
echo [5/6] Compiling builder...
call npm run builder:compile
if errorlevel 1 (
  echo ERROR: npm run builder:compile failed.
  goto :fail
)

echo.
echo [6/6] Building Astro site...
call npm run build
if errorlevel 1 (
  echo ERROR: npm run build failed.
  goto :fail
)

echo.
echo ========================================
echo Real Estate Template update complete.
echo ========================================
echo.
pause
exit /b 0

:fail
echo.
echo ========================================
echo Real Estate Template launcher stopped.
echo ========================================
echo.
pause
exit /b 1
