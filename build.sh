#!/bin/bash
# Build and install npc-studio

set -e  # Exit on any error

echo "==== Building npc-studio ===="
cd ~/npcww/npc-studio
npm run build

# Find the path to the new .deb file
DEB_FILE=$(find ./dist-electron -name "*.deb" -type f -print -quit)

if [ -z "$DEB_FILE" ]; then
    echo "Error: Could not find .deb file after build"
    exit 1
fi

echo "==== Found .deb package: $DEB_FILE ===="

echo "==== Uninstalling existing npc-studio ===="
# Try to uninstall if it exists, but don't fail if it doesn't
sudo dpkg -r npc-studio || echo "npc-studio not previously installed"

echo "==== Installing new npc-studio package ===="
sudo dpkg -i "$DEB_FILE"

# Fix any potential dependency issues
if [ $? -ne 0 ]; then
    echo "==== Fixing dependencies ===="
    sudo apt-get install -f -y
fi

echo "==== Installation complete ===="
echo "You can now run 'npc-studio' to start the application"