#!/bin/bash
# Build and install npc-studio on macOS

# --- Configuration ---
# The name of your application, which should match the name of the .app bundle
APP_NAME="npc-studio"
# The path to your project's root directory
PROJECT_DIR="$HOME/npcww/npc-studio"
# --- End Configuration ---

set -e # Exit on any error

echo "==== Navigating to project directory: $PROJECT_DIR ===="
# Ensure we are in the correct directory
cd "$PROJECT_DIR"

echo "==== Creating optimized Python bundle ===="
# Create a requirements.txt file for dependencies to be installed by the user
cat > requirements.txt << EOF
flask
flask_cors
flask_sse
redis
pyyaml
pillow
EOF

# Use PyInstaller to create a standalone Python executable for the backend
# The --name flag is used to ensure the output has a consistent name.
pyinstaller --onefile \
  --name npc_studio_serve \
  --clean \
  --noupx \
  --exclude-module=matplotlib \
  --exclude-module=scipy \
  --exclude-module=tensorflow \
  --exclude-module=torch \
  --exclude-module=sklearn \
  --exclude-module=notebook \
  --exclude-module=ipython \
  --exclude-module=jupyter \
  --exclude-module=nbconvert \
  --exclude-module=cv2 \
  --exclude-module=PIL.ImageTk \
  --exclude-module=PIL.ImageQt \
  --exclude-module=docx \
  --exclude-module=pptx \
  --exclude-module=cuda \
  --exclude-module=cudnn \
  --exclude-module=cudart \
  --exclude-module=cublas \
  --exclude-module=cupy \
  --exclude-module=numba.cuda \
  --exclude-module=torch.cuda \
  --exclude-module=tensorflow.python.framework.cuda_util \
  npc_studio_serve.py

echo "==== Preparing resources for Electron app ===="
# Create directory structure for our resources within the build context
mkdir -p ./resources/backend

# Copy the PyInstaller executable to the resources directory so electron-builder can bundle it
cp ./dist/npc_studio_serve ./resources/backend/

# Copy requirements file (useful for reference or manual installs)
cp requirements.txt ./resources/

echo "==== Building Electron app for macOS (.dmg) ===="
# This command invokes electron-builder, which will read package.json
# and build a .dmg file because we are running on macOS.
npm run build

echo "==== Found .dmg package in dist-electron directory ===="

echo "==== Uninstalling existing version of $APP_NAME ===="
APP_PATH="/Applications/$APP_NAME.app"
if [ -d "$APP_PATH" ]; then
    echo "Found existing installation at $APP_PATH. Removing it."
    rm -rf "$APP_PATH"
    echo "Old version removed."
else
    echo "$APP_NAME is not currently installed in /Applications."
fi

# Find the newest .dmg file in the output directory
DMG_FILE=$(find ./dist-electron -name "*.dmg" -type f -print0 | xargs -0 ls -t | head -n 1)

if [ -n "$DMG_FILE" ]; then
    echo "==== Installing new npc-studio package: $DMG_FILE ===="

    # Mount the DMG file silently
    echo "Mounting DMG..."
    MOUNT_OUTPUT=$(hdiutil attach "$DMG_FILE" -nobrowse)
    VOLUME_PATH=$(echo "$MOUNT_OUTPUT" | grep "/Volumes/" | awk 'BEGIN {FS="\t"}; {print $3}')
    
    # Find the .app bundle inside the mounted volume
    APP_BUNDLE_PATH=$(find "$VOLUME_PATH" -name "*.app" -maxdepth 1 -print -quit)

    if [ -d "$APP_BUNDLE_PATH" ]; then
        echo "Found App Bundle at $APP_BUNDLE_PATH"
        # Copy the .app bundle to the /Applications directory
        echo "Copying to /Applications..."
        ditto "$APP_BUNDLE_PATH" "$APP_PATH" # Use ditto for better metadata handling
        
        # Unmount the DMG
        echo "Unmounting DMG..."
        hdiutil detach "$VOLUME_PATH"
        
        echo "$APP_NAME installed successfully in /Applications."
    else
        echo "Error: Could not find .app bundle inside the DMG."
        # Unmount the DMG even if it fails
        hdiutil detach "$VOLUME_PATH"
        exit 1
    fi
else
    echo "Error: No .dmg file found in dist-electron directory."
    exit 1
fi

echo "==== Installing Python dependencies ===="
# Use pip3 which is standard on modern macOS.
# Advise the user that this may require sudo depending on their Python setup.
echo "This may require your administrator password to install packages system-wide."
sudo pip3 install -r requirements.txt

echo "==== Installation complete ===="
echo "You can now run '$APP_NAME' from your Applications folder or Launchpad."
echo "To run from the terminal, use: open /Applications/$APP_NAME.app"