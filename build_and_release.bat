@echo off
setlocal enabledelayedexpansion
title Guidegram - Build ^& Remote Cloud Release Trigger

echo =======================================================
echo        Guidegram Multiplatform Build Manager
echo =======================================================
echo.
echo [1] Build Local Windows Portable Executable (.exe / .zip)
echo [2] Trigger GitHub Actions to Build macOS (.dmg) ^& Linux in Cloud
echo [3] Full Release: Build Local Windows + Trigger Remote Cloud
echo [4] Open GitHub Actions Web Console in Browser
echo [5] Exit
echo.
set /p choice="Select an option [1-5]: "

if "%choice%"=="1" goto build_local
if "%choice%"=="2" goto trigger_cloud
if "%choice%"=="3" goto full_release
if "%choice%"=="4" goto open_browser
if "%choice%"=="5" goto end
goto invalid

:build_local
echo.
echo [*] Compiling TypeScript and bundling Vite frontend...
call pnpm run build
if %errorlevel% neq 0 (
    echo [!] Build failed! Check compiler errors.
    pause
    exit /b %errorlevel%
)
echo [*] Backing up any existing session data before packaging...
if exist "release\win-unpacked\data" (
    powershell -Command "Copy-Item -Path 'release\win-unpacked\data' -Destination '.data_build_backup' -Recurse -Force"
)
echo [*] Packaging Windows portable application with custom branding...
taskkill /F /IM Guidegram.exe /T >nul 2>&1
call pnpm exec electron-builder --win dir
if exist ".data_build_backup" (
    echo [*] Restoring saved user sessions and accounts to output folder...
    powershell -Command "Copy-Item -Path '.data_build_backup\*' -Destination 'release\win-unpacked\data' -Recurse -Force; Remove-Item -Path '.data_build_backup' -Recurse -Force"
)
echo [*] Compressing portable ZIP archive...
powershell -Command "Compress-Archive -Path 'release/win-unpacked/*' -DestinationPath 'release/Guidegram-Windows-x64-Portable.zip' -Force"
echo.
echo [OK] Windows build complete! Executable is ready at:
echo      release\win-unpacked\Guidegram.exe
echo      release\Guidegram-Windows-x64-Portable.zip
echo.
pause
goto end

:trigger_cloud
echo.
echo [*] Triggering GitHub Actions Workflow (macOS .dmg + Linux)...
echo.
set /p tag="Enter Release Tag (e.g. v1.0.1) or leave empty for build-only: "
set /p title="Enter Release Title (optional): "
echo.
where gh >nul 2>&1
if %errorlevel% equ 0 (
    if "%tag%"=="" (
        call gh workflow run build-release.yml
    ) else (
        call gh workflow run build-release.yml -f tag_name="%tag%" -f release_title="%title%"
    )
    echo [OK] GitHub Action triggered successfully via gh cli!
) else (
    echo [i] GitHub CLI (gh) is not installed.
    echo [*] Opening the GitHub Actions page in your browser where you can click "Run workflow"...
    start https://github.com/DoctorGuidance/guidegram/actions/workflows/build-release.yml
)
echo.
pause
goto end

:full_release
echo.
echo [*] Step 1: Building local Windows binary...
call pnpm run build
taskkill /F /IM Guidegram.exe /T >nul 2>&1
call pnpm exec electron-builder --win dir
powershell -Command "Compress-Archive -Path 'release/win-unpacked/*' -DestinationPath 'release/Guidegram-Windows-x64-Portable.zip' -Force"
echo.
echo [*] Step 2: Triggering Cloud macOS and Linux build on GitHub Actions...
set /p tag="Enter Release Tag (e.g. v1.0.1) to publish both together: "
if not "%tag%"=="" (
    where gh >nul 2>&1
    if %errorlevel% equ 0 (
        call gh release create "%tag%" "release\Guidegram-Windows-x64-Portable.zip" --title "%tag%" --notes "Guidegram Multiplatform Release"
        call gh workflow run build-release.yml -f tag_name="%tag%"
        echo [OK] Windows binary uploaded and macOS cloud build initiated!
    ) else (
        start https://github.com/DoctorGuidance/guidegram/actions/workflows/build-release.yml
    )
) else (
    start https://github.com/DoctorGuidance/guidegram/actions/workflows/build-release.yml
)
echo.
pause
goto end

:open_browser
start https://github.com/DoctorGuidance/guidegram/actions/workflows/build-release.yml
goto end

:invalid
echo [!] Invalid selection.
pause
goto end

:end
exit /b 0
