@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo GROW+ - Push to GitHub
echo ============================================
echo.

echo [1/4] Adding all files...
git add -A
if errorlevel 1 (
    echo ERROR: git add failed
    pause
    exit /b 1
)

echo [2/4] Checking status...
git status
echo.

echo [3/4] Creating commit...
git commit -m "Initial commit: GROW+ project website"
if errorlevel 1 (
    echo.
    echo Note: If you see "nothing to commit", files may already be committed.
    echo Trying push anyway...
)

echo [4/4] Pushing to GitHub...
git push -u origin master
if errorlevel 1 (
    echo.
    echo Master failed. Trying 'main' branch (GitHub default)...
    git push -u origin master:main
)
if errorlevel 1 (
    echo.
    echo ============================================
    echo PUSH FAILED - Common fixes:
    echo ============================================
    echo 1. Create repo on GitHub: https://github.com/new
    echo    Name it GROW (or run: git remote set-url origin YOUR_NEW_REPO_URL)
    echo.
    echo 2. Use Personal Access Token instead of password:
    echo    GitHub Settings -^> Developer settings -^> Personal access tokens
    echo    Create token with "repo" scope, use it as password when prompted
    echo.
    echo 3. If branch is "main" on GitHub, run: git push -u origin master:main
    echo ============================================
    pause
    exit /b 1
)

echo.
echo SUCCESS! Your website has been pushed to GitHub.
echo Repo: https://github.com/mazorms-ctrl/GROW
echo.
pause
