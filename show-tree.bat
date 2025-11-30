@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

REM Set project root
set "ROOT=C:\Users\lunes\homebase-finder"

REM ---------- Root Files ----------
echo Root Files:
for %%f in ("%ROOT%\*") do (
    if not exist "%%f\" (
        echo   ^|-- %%~nxf
    )
)

REM ---------- Public Folder ----------
if exist "%ROOT%\public" (
    echo.
    echo Public Files and Folders:
    for /R "%ROOT%\public" %%f in (*) do (
        REM Skip node_modules if it exists
        echo %%f | findstr /I "node_modules" >nul
        if errorlevel 1 (
            REM Show relative path from public folder
            set "rel=%%f"
            set "rel=!rel:%ROOT%\public\=!"
            echo   ^|-- !rel!
        )
    )
)

REM ---------- Src Folder ----------
if exist "%ROOT%\src" (
    echo.
    echo Src Files and Folders:
    for /R "%ROOT%\src" %%f in (*) do (
        REM Skip node_modules if it exists
        echo %%f | findstr /I "node_modules" >nul
        if errorlevel 1 (
            REM Show relative path from src folder
            set "rel=%%f"
            set "rel=!rel:%ROOT%\src\=!"
            echo   ^|-- !rel!
        )
    )
)

pause
ENDLOCAL
