#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  Ubuntu Time Machine Package Builder  ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo ""

# Check dependencies
echo -e "${YELLOW}Checking build dependencies...${NC}"
MISSING_DEPS=0

# Check for required commands
for cmd in electron electron-builder npm cmake make g++; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}✗ $cmd not found!${NC}"
        MISSING_DEPS=1
    else
        echo -e "${GREEN}✓ $cmd found${NC}"
    fi
done

if [ "$MISSING_DEPS" -eq 1 ]; then
    echo -e "${RED}Please install missing dependencies and try again.${NC}"
    exit 1
fi

# Set up environment
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BUILD_DIR="$SCRIPT_DIR/build"
PACKAGE_DIR="$SCRIPT_DIR/dist"

echo -e "${YELLOW}Setting up build directories...${NC}"
mkdir -p "$BUILD_DIR"
mkdir -p "$PACKAGE_DIR"

# Build the core engine
echo -e "${YELLOW}Building core engine...${NC}"
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
echo -e "${GREEN}Core engine built successfully!${NC}"

# Build the GUI
echo -e "${YELLOW}Building GUI...${NC}"
cd "$SCRIPT_DIR"
npm install
npm run build
echo -e "${GREEN}GUI built successfully!${NC}"

# Package the application with electron-builder
echo -e "${YELLOW}Packaging application...${NC}"
cd "$SCRIPT_DIR"
npx electron-builder --linux deb dir
echo -e "${GREEN}Application packaged successfully!${NC}"

# Copy files to package directory
echo -e "${YELLOW}Creating distribution package...${NC}"
cp -r "$SCRIPT_DIR/dist" "$PACKAGE_DIR"

# Generate desktop entry
echo -e "${YELLOW}Creating desktop integration files...${NC}"
cat > "$PACKAGE_DIR/ubuntu-time-machine.desktop" << EOL
[Desktop Entry]
Name=Ubuntu Time Machine
Comment=Backup and restore system with versioning
Exec=/usr/bin/ubuntu-time-machine
Icon=/usr/share/icons/hicolor/256x256/apps/ubuntu-time-machine.png
Terminal=false
Type=Application
Categories=Utility;System;
Keywords=backup;restore;time machine;
EOL

echo -e "${GREEN}=======================================${NC}"
echo -e "${GREEN}  Package created successfully!        ${NC}"
echo -e "${GREEN}  Output located in: $PACKAGE_DIR      ${NC}"
echo -e "${GREEN}=======================================${NC}" 