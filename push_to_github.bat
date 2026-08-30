@echo off
title Push to GitHub
cd /d "%~dp0"
echo Setting remote to https://github.com/Ameen-Bro/discord-music-bot-klv.git ...
git remote set-url origin https://github.com/Ameen-Bro/discord-music-bot-klv.git
echo Pushing main branch to GitHub...
git push -u origin main
echo.
if %errorlevel% equ 0 (
    echo ==============================================
    echo  Successfully pushed to GitHub!
    echo ==============================================
) else (
    echo An error occurred during push. Please ensure you are logged into GitHub.
)
pause
