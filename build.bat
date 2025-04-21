@echo off
:: Build and install npc-studio

setlocal enabledelayedexpansion

:: Activate the virtual environment
echo ==== Activating virtual environment ====
call %USERPROFILE%\npcww\npcsh\.venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo ==== Failed to activate virtual environment ====
    exit /b 1
)

echo ==== Building npc-studio ====
cd %USERPROFILE%\npcww\npc-studio
npm run build

:: Find the path to the new .exe file
for /r .\dist-electron %%f in (*.exe) do (
    set "EXE_FILE=%%f"
    goto :found
)
:found

if not defined EXE_FILE (
    echo Error: Could not find .exe file after build
    exit /b 1
)

echo ==== Found .exe package: %EXE_FILE% ====

echo ==== Uninstalling existing npc-studio ====
:: Try to uninstall if it exists, but don't fail if it doesn't
wmic product where "name='npc-studio'" call uninstall /nointeractive || echo npc-studio not previously installed

echo ==== Installing new npc-studio package ====
:: Run the installer
"%EXE_FILE%" /S

if %errorlevel% neq 0 (
    echo ==== Installation failed ====
    exit /b 1
)

echo ==== Installation complete ====
echo You can now run 'npc-studio' to start the application