#!/bin/bash
# Unified build script for npc serve and Electron app

# Exit on error
set -e

# Variables
ELECTRON_DIR="$(pwd)"  # Root of your Electron project
PYTHON_ENTRY="npc_studio_serve.py"  # Python entry point for npc serve
BACKEND_DIR="$ELECTRON_DIR/resources/backend"  # Where the backend executable will go
PYINSTALLER_DIST_DIR="$ELECTRON_DIR/pyinstaller_dist"  # PyInstaller output directory
ELECTRON_DIST_DIR="$ELECTRON_DIR/dist"  # Electron-builder output directory

# Step 1: Bundle npc serve with PyInstaller
echo "Step 1: Bundling npc serve with PyInstaller..."
cd "$ELECTRON_DIR"

# Run PyInstaller and ensure logs are captured
echo "Running PyInstaller..."
pyinstaller --onefile "$PYTHON_ENTRY" --name npc_serve --distpath "$PYINSTALLER_DIST_DIR" --debug all

# Check PyInstaller output
echo "Checking PyInstaller output..."
ls -al "$PYINSTALLER_DIST_DIR"

# Move the bundled executable to the backend directory
echo "Moving npc_serve executable to $BACKEND_DIR..."
mkdir -p "$BACKEND_DIR"
cp "$PYINSTALLER_DIST_DIR/npc_serve" "$BACKEND_DIR/"

# Clean up PyInstaller artifacts
echo "Cleaning up PyInstaller artifacts..."
rm -rf build npc_serve.spec

# Step 2: Build the Electron app
echo "Step 2: Building the Electron app..."

# Install dependencies if needed
echo "Installing npm dependencies..."
npm install

# Build the Electron app
echo "Running electron-builder..."
npm run build

# Step 3: Manually copy npc_serve to the unpacked resources
echo "Manually moving npc_serve to dist-electron/linux-unpacked/resources/backend..."
mkdir -p "$ELECTRON_DIST_DIR/linux-unpacked/resources/backend"
cp "$BACKEND_DIR/npc_serve" "$ELECTRON_DIST_DIR/linux-unpacked/resources/backend/"

# Step 4: Verify the build
echo "Step 4: Verifying the build..."
if [ -f "$ELECTRON_DIST_DIR/linux-unpacked/resources/backend/npc_serve" ]; then
    echo "Build successful! The npc_serve executable is included in the Electron app."
else
    echo "Error: npc_serve executable not found in the final build."
    echo "Checking contents of $ELECTRON_DIST_DIR..."
    ls -R "$ELECTRON_DIST_DIR"
    exit 1
fi

echo "Build process complete! The Electron app is ready in $ELECTRON_DIST_DIR."
