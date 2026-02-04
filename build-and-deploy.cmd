@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo GROW+ - Build and Deploy to GitHub Pages
echo ============================================
echo.

echo [1/5] Building the project...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)
echo Build completed successfully!
echo.

echo [2/5] Checking git status...
git status
echo.

echo [3/5] Adding all files including dist folder...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed
    pause
    exit /b 1
)
echo.

echo [4/5] Creating commit...
git commit -m "Fix: Update GROW CRM to working version - Include dist folder for GitHub Pages"
if errorlevel 1 (
    echo.
    echo Note: If you see "nothing to commit", files may already be committed.
    echo Continuing anyway...
)
echo.

echo [5/5] Pushing to GitHub...
git push origin master
if errorlevel 1 (
    echo ERROR: Push failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo SUCCESS! Your site has been deployed.
echo.
echo GitHub Pages URL: https://mazorms-ctrl.github.io/GROW/
echo.
echo Note: It may take a few minutes for GitHub Pages to update.
echo ============================================
echo.
pause
