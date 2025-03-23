#!/bin/bash
# Simplified Production Package Builder for Ubuntu Time Machine

set -e

echo "=== Ubuntu Time Machine - Quick Package Builder ==="
echo "This script creates a simplified production package"
echo ""

# Setup directories
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BUILD_DIR="$SCRIPT_DIR/build"
DIST_DIR="$SCRIPT_DIR/dist"
PACKAGE_DIR="$SCRIPT_DIR/packaging"
DEBIAN_DIR="$PACKAGE_DIR/DEBIAN"
INSTALL_DIR="$PACKAGE_DIR/usr"
BIN_DIR="$INSTALL_DIR/bin"
LIB_DIR="$INSTALL_DIR/lib/ubuntu-time-machine"
SHARE_DIR="$INSTALL_DIR/share"
APPLICATIONS_DIR="$SHARE_DIR/applications"

# Create directories
echo "Creating build directories..."
rm -rf "$BUILD_DIR" "$DIST_DIR" "$PACKAGE_DIR" || true
mkdir -p "$BUILD_DIR" "$DIST_DIR" "$DEBIAN_DIR" "$BIN_DIR" "$LIB_DIR" "$APPLICATIONS_DIR"

# Build C++ core
echo "Building C++ core..."
cd "$BUILD_DIR"
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
echo "Core built successfully"

# Build GUI
echo "Building GUI..."
cd "$SCRIPT_DIR/src/gui"
npm install --ignore-scripts
NODE_ENV=production npm run build || echo "Warning: GUI build failed, continuing with available files"

# Create control file
echo "Creating package control file..."
cat > "$DEBIAN_DIR/control" << EOL
Package: ubuntu-time-machine
Version: 1.0.0
Section: utils
Priority: optional
Architecture: amd64
Depends: libc6 (>= 2.27), libstdc++6 (>= 8.0), libgtk-3-0 (>= 3.18.9), libnotify4 (>= 0.7.0)
Maintainer: Ubuntu Time Machine Team <support@ubuntutimemachine.org>
Homepage: https://github.com/ubuntu/time-machine
Description: Professional backup and restore utility for Ubuntu
 Ubuntu Time Machine provides backup and restore functionality
 with versioning support.
EOL

# Create desktop file
echo "Creating desktop file..."
cat > "$APPLICATIONS_DIR/ubuntu-time-machine.desktop" << EOL
[Desktop Entry]
Name=Ubuntu Time Machine
GenericName=Backup Tool
Comment=Backup and restore your system with versioning
Exec=/usr/bin/ubuntu-time-machine
Icon=ubuntu-time-machine
Terminal=false
Type=Application
Categories=Utility;System;Archiving;
Keywords=backup;restore;time machine;
EOL

# Copy necessary files
echo "Copying application files..."
# Copy core files
cp "$BUILD_DIR/src/core/utm-core" "$BIN_DIR/" || echo "Warning: Failed to copy core binary"
cp "$BUILD_DIR/src/core/libutm_core.so" "$LIB_DIR/" || echo "Warning: Failed to copy core library"

# Copy GUI files if they exist
if [ -d "$SCRIPT_DIR/src/gui/dist" ]; then
    cp -r "$SCRIPT_DIR/src/gui/dist"/* "$LIB_DIR/" || echo "Warning: Failed to copy GUI files"
fi

# Create launcher script
cat > "$BIN_DIR/ubuntu-time-machine" << EOL
#!/bin/sh
# Launcher for Ubuntu Time Machine
exec /usr/lib/ubuntu-time-machine/ubuntu-time-machine "\$@"
EOL
chmod 755 "$BIN_DIR/ubuntu-time-machine"

# Set proper permissions
find "$PACKAGE_DIR" -type d -exec chmod 755 {} \;
find "$PACKAGE_DIR" -type f -exec chmod 644 {} \;
find "$BIN_DIR" -type f -exec chmod 755 {} \;

# Build the package
echo "Building Debian package..."
cd "$SCRIPT_DIR"
fakeroot dpkg-deb --build "$PACKAGE_DIR" "$DIST_DIR/ubuntu-time-machine_1.0.0_amd64.deb"

echo ""
echo "Package creation complete."
echo "Package location: $DIST_DIR/ubuntu-time-machine_1.0.0_amd64.deb" 