@echo off
:: Build and install npc-studio with additional packages
setlocal enabledelayedexpansion

:: Activate the virtual environment
echo ==== Activating virtual environment ====
call %USERPROFILE%\npcww\npcsh\.venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo ==== Failed to activate virtual environment ====
    exit /b 1
)

:: Ensure required packages are installed
echo ==== Ensuring required packages are installed ====
pip install -U ollama transformers diffusers

if %errorlevel% neq 0 (
    echo ==== Failed to install required packages ====
    exit /b 1
)

:: Run PyInstaller for the Python component with additional packages
echo ==== Packaging Python component with PyInstaller ====
pyinstaller --onefile --hidden-import=ollama --hidden-import=transformers --hidden-import=diffusers npc_studio_serve.py

if %errorlevel% neq 0 (
    echo ==== PyInstaller packaging failed ====
    exit /b 1
)

:: Build the frontend
echo ==== Building npc-studio ====
cd %USERPROFILE%\npcww\npc-studio
npm run build

if %errorlevel% neq 0 (
    echo ==== npm build failed ====
    exit /b 1
)

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

:: Add the PyInstaller output to the installation
echo ==== Copying PyInstaller output to installation directory ====
copy /Y "dist\npc_studio_serve.exe" "%PROGRAMFILES%\npc-studio\"

:: Create a folder for additional dependencies if needed
mkdir "%PROGRAMFILES%\npc-studio\dependencies" 2>nul

echo ==== Installation complete ====
echo You can now run 'npc-studio' to start the application