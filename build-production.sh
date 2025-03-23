#!/bin/bash
# Production Packaging Script for Ubuntu Time Machine
# This script creates a production-ready .deb package for distribution

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Application metadata
APP_NAME="ubuntu-time-machine"
VERSION="1.0.0"  # Semantic versioning
MAINTAINER="Ubuntu Time Machine Team <support@ubuntutimemachine.org>"
HOMEPAGE="https://github.com/ubuntu/time-machine"
BUG_REPORT="https://github.com/ubuntu/time-machine/issues"
LICENSE="GPL-3.0"
DESCRIPTION="Professional backup and restore utility with versioning capabilities for Ubuntu systems"

# Print header
print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}║${BOLD}  Ubuntu Time Machine - Production Package Builder  ${NC}${BLUE}║${NC}"
    echo -e "${BLUE}║                                                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
    echo -e "${YELLOW}Version:${NC} $VERSION"
    echo -e "${YELLOW}Target:${NC} Ubuntu 20.04 LTS and newer (amd64)"
    echo -e ""
}

# Print section header
print_section() {
    echo -e "\n${BOLD}${GREEN}▶ $1${NC}\n"
}

# Print task
print_task() {
    echo -e "  ${YELLOW}•${NC} $1"
}

# Print success
print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

# Print error and exit
print_error() {
    echo -e "\n${RED}✗ ERROR: $1${NC}\n"
    exit 1
}

# Print warning
print_warning() {
    echo -e "  ${RED}!${NC} $1"
}

# Check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_warning "$1 not found"
        return 1
    else
        print_success "$1 found"
        return 0
    fi
}

# Check dependencies
check_dependencies() {
    print_section "Checking build dependencies"
    
    local missing_deps=0
    
    # Essential build tools
    print_task "Checking for essential build tools..."
    tools=("cmake" "make" "g++" "dpkg-deb" "fakeroot" "lintian" "strip")
    for tool in "${tools[@]}"; do
        check_command $tool || missing_deps=1
    done
    
    # Node.js and related tools
    print_task "Checking for Node.js and related tools..."
    node_tools=("node" "npm" "npx")
    for tool in "${node_tools[@]}"; do
        check_command $tool || missing_deps=1
    done
    
    # Electron tools
    print_task "Checking for Electron tools..."
    electron_tools=("electron" "electron-builder")
    for tool in "${electron_tools[@]}"; do
        check_command $tool || missing_deps=1
    done
    
    # Additional tools
    print_task "Checking for additional tools..."
    add_tools=("dh_make")
    for tool in "${add_tools[@]}"; do
        check_command $tool || missing_deps=1
    done
    
    if [ "$missing_deps" -eq 1 ]; then
        print_error "Please install missing dependencies and try again"
    fi
    
    return 0
}

# Set up directories
setup_directories() {
    print_section "Setting up build environment"
    
    # Get the absolute path of the script directory
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    
    # Define build directories
    BUILD_DIR="$SCRIPT_DIR/build"
    DIST_DIR="$SCRIPT_DIR/dist"
    PACKAGE_BUILD_DIR="$SCRIPT_DIR/packaging"
    DEBIAN_DIR="$PACKAGE_BUILD_DIR/DEBIAN"
    INSTALL_DIR="$PACKAGE_BUILD_DIR/usr"
    BIN_DIR="$INSTALL_DIR/bin"
    LIB_DIR="$INSTALL_DIR/lib/$APP_NAME"
    SHARE_DIR="$INSTALL_DIR/share"
    DOC_DIR="$SHARE_DIR/doc/$APP_NAME"
    ICON_DIR="$SHARE_DIR/icons/hicolor"
    APPLICATIONS_DIR="$SHARE_DIR/applications"
    MAN_DIR="$SHARE_DIR/man/man1"
    
    # Clean previous build artifacts
    print_task "Cleaning previous build artifacts..."
    rm -rf "$BUILD_DIR" "$DIST_DIR" "$PACKAGE_BUILD_DIR"
    
    # Create necessary directories
    print_task "Creating build directories..."
    mkdir -p "$BUILD_DIR" "$DIST_DIR" "$DEBIAN_DIR" "$BIN_DIR" "$LIB_DIR" "$DOC_DIR"
    mkdir -p "$APPLICATIONS_DIR" "$MAN_DIR"
    mkdir -p "$ICON_DIR/16x16/apps" "$ICON_DIR/32x32/apps" "$ICON_DIR/48x48/apps" "$ICON_DIR/128x128/apps" "$ICON_DIR/256x256/apps"
    
    print_success "Build environment set up successfully"
}

# Build C++ core engine with optimizations
build_core() {
    print_section "Building C++ core engine (Release build)"
    
    cd "$SCRIPT_DIR"
    
    print_task "Configuring CMake with release optimizations..."
    cd "$BUILD_DIR"
    cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DCMAKE_CXX_FLAGS="-O3 -march=x86-64 -mtune=generic -flto" \
        -DCMAKE_EXE_LINKER_FLAGS="-Wl,--as-needed -Wl,--strip-all" \
        -DBUILD_TESTING=OFF || print_error "CMake configuration failed"
    
    print_task "Compiling C++ core engine..."
    make -j$(nproc) || print_error "Compilation failed"
    
    print_task "Stripping debug symbols from binaries..."
    find "$BUILD_DIR" -type f -executable -exec strip --strip-all {} \; 2>/dev/null || true
    find "$BUILD_DIR" -name "*.so*" -exec strip --strip-unneeded {} \; 2>/dev/null || true
    
    print_success "Core engine built successfully"
}

# Build and optimize GUI
build_gui() {
    print_section "Building and optimizing GUI"
    
    cd "$SCRIPT_DIR/src/gui"
    
    print_task "Installing all npm dependencies for building..."
    npm install --ignore-scripts || print_error "Failed to install npm dependencies"
    
    print_task "Building production GUI assets..."
    NODE_ENV=production npm run build || print_error "Failed to build GUI"
    
    print_task "Removing development dependencies..."
    rm -rf node_modules
    npm install --only=production --ignore-scripts || print_error "Failed to install production dependencies"
    
    print_success "GUI built successfully"
}

# Create Debian package control files
create_debian_control() {
    print_section "Creating Debian package control files"
    
    # Calculate installed size
    INSTALLED_SIZE=$(du -sk "$PACKAGE_BUILD_DIR" | cut -f1)
    
    # Create control file
    print_task "Creating control file..."
    cat > "$DEBIAN_DIR/control" << EOL
Package: $APP_NAME
Version: $VERSION
Section: utils
Priority: optional
Architecture: amd64
Installed-Size: $INSTALLED_SIZE
Depends: libc6 (>= 2.27), libstdc++6 (>= 8.0), libglib2.0-0 (>= 2.37.3), libgtk-3-0 (>= 3.18.9), libnotify4 (>= 0.7.0), libx11-6, libxss1, libxtst6, libappindicator3-1, libnss3 (>= 3.26), libxdamage1, libasound2 (>= 1.0.16)
Recommends: pulseaudio | libasound2
Suggests: gvfs
Maintainer: $MAINTAINER
Homepage: $HOMEPAGE
Description: $DESCRIPTION
 Ubuntu Time Machine provides an easy-to-use interface for creating
 automated backups of your system with versioning support.
 .
 Features:
  * Automatic incremental backups
  * Point-in-time system restore
  * File and folder recovery
  * Backup encryption
  * External drive support
  * Scheduled backups
  * Low resource utilization
EOL
    
    # Create copyright file
    print_task "Creating copyright file..."
    cat > "$DOC_DIR/copyright" << EOL
Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: ubuntu-time-machine
Upstream-Contact: $MAINTAINER
Source: $HOMEPAGE

Files: *
Copyright: $(date +%Y) Ubuntu Time Machine Team
License: GPL-3.0
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 .
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 .
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 .
 On Debian systems, the full text of the GNU General Public License
 version 3 can be found in the file '/usr/share/common-licenses/GPL-3'.
EOL
    
    # Create changelog
    print_task "Creating changelog..."
    cat > "$DOC_DIR/changelog" << EOL
$APP_NAME ($VERSION) stable; urgency=medium

  * Initial release
  * Feature: Incremental backups
  * Feature: Point-in-time restore
  * Feature: Backup encryption
  * Feature: External drive support
  * Feature: Scheduled backups

 -- $MAINTAINER  $(date -R)
EOL
    gzip -9 -n "$DOC_DIR/changelog"
    
    # Create postinst script
    print_task "Creating postinst script..."
    cat > "$DEBIAN_DIR/postinst" << EOL
#!/bin/sh
set -e

# Update desktop database
if [ -x /usr/bin/update-desktop-database ]; then
    /usr/bin/update-desktop-database -q
fi

# Update icon cache
if [ -x /usr/bin/gtk-update-icon-cache ]; then
    /usr/bin/gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor
fi

# Update mime database
if [ -x /usr/bin/update-mime-database ]; then
    /usr/bin/update-mime-database /usr/share/mime
fi

# Add application to system backup group
if [ "\$1" = "configure" ]; then
    # Set proper permissions for the backup engine
    chmod 755 /usr/bin/utm-core
    # Add setcap for raw disk access if needed
    setcap cap_dac_read_search,cap_sys_rawio+ep /usr/bin/utm-core || true
fi

exit 0
EOL
    chmod 755 "$DEBIAN_DIR/postinst"
    
    # Create postrm script
    print_task "Creating postrm script..."
    cat > "$DEBIAN_DIR/postrm" << EOL
#!/bin/sh
set -e

if [ "\$1" = "purge" ]; then
    # Remove application data
    rm -rf /etc/$APP_NAME
    rm -rf /var/lib/$APP_NAME
fi

# Update desktop database
if [ -x /usr/bin/update-desktop-database ]; then
    /usr/bin/update-desktop-database -q
fi

# Update icon cache
if [ -x /usr/bin/gtk-update-icon-cache ]; then
    /usr/bin/gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor
fi

exit 0
EOL
    chmod 755 "$DEBIAN_DIR/postrm"
    
    print_success "Debian control files created successfully"
}

# Copy files to package structure
create_package_structure() {
    print_section "Creating package structure"
    
    # Copy core binary and libraries
    print_task "Copying core engine files..."
    cp "$BUILD_DIR/src/core/utm-core" "$BIN_DIR/" || print_error "Failed to copy core binary"
    cp "$BUILD_DIR/src/core/libutm_core.so" "$LIB_DIR/" || print_error "Failed to copy core library"
    
    # Copy Electron app
    print_task "Copying GUI files..."
    cp -r "$SCRIPT_DIR/src/gui/dist"/* "$LIB_DIR/" || print_error "Failed to copy GUI files"
    cp -r "$SCRIPT_DIR/src/gui/node_modules" "$LIB_DIR/" || print_error "Failed to copy node modules"
    
    # Copy documentation
    print_task "Copying documentation..."
    cp "$SCRIPT_DIR/README.md" "$DOC_DIR/" || print_error "Failed to copy README"
    cp "$SCRIPT_DIR/LICENSE" "$DOC_DIR/" || print_error "Failed to copy LICENSE"
    [ -f "$SCRIPT_DIR/INSTALLATION.md" ] && cp "$SCRIPT_DIR/INSTALLATION.md" "$DOC_DIR/"
    
    # Create launcher script
    print_task "Creating launcher script..."
    cat > "$BIN_DIR/$APP_NAME" << EOL
#!/bin/sh
# Launcher for Ubuntu Time Machine
exec /usr/lib/ubuntu-time-machine/ubuntu-time-machine "\$@"
EOL
    chmod 755 "$BIN_DIR/$APP_NAME"
    
    # Create desktop file
    print_task "Creating desktop file..."
    cat > "$APPLICATIONS_DIR/$APP_NAME.desktop" << EOL
[Desktop Entry]
Name=Ubuntu Time Machine
GenericName=Backup Tool
Comment=Backup and restore your system with versioning
Exec=/usr/bin/$APP_NAME
Icon=$APP_NAME
Terminal=false
Type=Application
Categories=Utility;System;Archiving;
Keywords=backup;restore;time machine;snapshot;version;
StartupNotify=true
StartupWMClass=ubuntu-time-machine
EOL
    
    # Copy icons
    print_task "Copying application icons..."
    cp "$SCRIPT_DIR/src/gui/resources/icons/16x16.png" "$ICON_DIR/16x16/apps/$APP_NAME.png" 2>/dev/null || true
    cp "$SCRIPT_DIR/src/gui/resources/icons/32x32.png" "$ICON_DIR/32x32/apps/$APP_NAME.png" 2>/dev/null || true
    cp "$SCRIPT_DIR/src/gui/resources/icons/48x48.png" "$ICON_DIR/48x48/apps/$APP_NAME.png" 2>/dev/null || true
    cp "$SCRIPT_DIR/src/gui/resources/icons/128x128.png" "$ICON_DIR/128x128/apps/$APP_NAME.png" 2>/dev/null || true
    cp "$SCRIPT_DIR/src/gui/resources/icons/256x256.png" "$ICON_DIR/256x256/apps/$APP_NAME.png" 2>/dev/null || true
    
    # Create man page
    print_task "Creating man page..."
    cat > "$MAN_DIR/$APP_NAME.1" << EOL
.TH UBUNTU-TIME-MACHINE 1 "$(date +"%B %Y")" "Ubuntu Time Machine $VERSION" "User Commands"
.SH NAME
ubuntu-time-machine \- backup and restore utility with versioning for Ubuntu systems
.SH SYNOPSIS
.B ubuntu-time-machine
[\fIOPTIONS\fR]
.SH DESCRIPTION
.B Ubuntu Time Machine
is a professional backup and restore utility with versioning capabilities for Ubuntu systems.
It provides an easy-to-use interface for creating automated backups of your system with the
ability to restore to any previous state.
.SH OPTIONS
.TP
.BR \-h ", " \-\-help
Show this help message and exit
.TP
.BR \-v ", " \-\-version
Display the version and exit
.TP
.BR \-\-no\-sandbox
Run without sandbox (not recommended for normal use)
.SH FILES
.TP
.I /etc/ubuntu-time-machine/config.json
System-wide configuration file
.TP
.I ~/.config/ubuntu-time-machine/
User-specific configuration directory
.TP
.I ~/.local/share/ubuntu-time-machine/
User-specific data directory
.SH AUTHOR
Ubuntu Time Machine Team <support@ubuntutimemachine.org>
.SH BUGS
Report bugs to $BUG_REPORT
.SH COPYRIGHT
Copyright \(co $(date +%Y) Ubuntu Time Machine Team.
License GPLv3+: GNU GPL version 3 or later <https://gnu.org/licenses/gpl.html>.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
EOL
    gzip -9 -n "$MAN_DIR/$APP_NAME.1"
    
    # Fix permissions
    print_task "Setting correct permissions..."
    find "$PACKAGE_BUILD_DIR" -type d -exec chmod 755 {} \;
    find "$PACKAGE_BUILD_DIR" -type f -exec chmod 644 {} \;
    find "$BIN_DIR" -type f -exec chmod 755 {} \;
    [ -f "$DEBIAN_DIR/postinst" ] && chmod 755 "$DEBIAN_DIR/postinst"
    [ -f "$DEBIAN_DIR/postrm" ] && chmod 755 "$DEBIAN_DIR/postrm"
    
    print_success "Package structure created successfully"
}

# Build the Debian package
build_deb_package() {
    print_section "Building Debian package"
    
    # Calculate MD5 sums
    print_task "Calculating MD5 checksums..."
    cd "$PACKAGE_BUILD_DIR"
    find usr -type f -exec md5sum {} \; > "$DEBIAN_DIR/md5sums"
    
    # Build the package
    print_task "Building the .deb package..."
    cd "$SCRIPT_DIR"
    fakeroot dpkg-deb --build "$PACKAGE_BUILD_DIR" "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" || \
        print_error "Failed to build .deb package"
    
    # Verify the package with lintian
    print_task "Verifying package with lintian..."
    lintian --pedantic "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" || \
        print_warning "Lintian reported issues with the package"
    
    print_success "Debian package built successfully"
}

# Sign the package
sign_package() {
    print_section "Signing the package"
    
    if command -v dpkg-sig &> /dev/null; then
        print_task "Signing .deb package with GPG key..."
        if [ -n "$SIGN_KEY" ]; then
            dpkg-sig --sign builder -k "$SIGN_KEY" "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" || \
                print_warning "Failed to sign package"
            print_success "Package signed successfully"
        else
            print_warning "No signing key provided. Package will not be signed."
            print_warning "To sign the package, set the SIGN_KEY environment variable."
        fi
    else
        print_warning "dpkg-sig not installed. Package will not be signed."
    fi
}

# Create a package report
create_package_report() {
    print_section "Creating package report"
    
    REPORT_FILE="$DIST_DIR/package-report.txt"
    
    print_task "Generating package report..."
    
    {
        echo "Ubuntu Time Machine Package Report"
        echo "=================================="
        echo
        echo "Package Information:"
        echo "  Name:        $APP_NAME"
        echo "  Version:     $VERSION"
        echo "  Maintainer:  $MAINTAINER"
        echo "  Date:        $(date)"
        echo
        echo "Package Contents:"
        echo "------------------"
        dpkg -c "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" | sort
        echo
        echo "Package Control Information:"
        echo "-------------------------"
        dpkg -I "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb"
        echo
        echo "MD5 Checksum:"
        echo "------------"
        md5sum "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb"
        echo
        echo "SHA256 Checksum:"
        echo "--------------"
        sha256sum "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb"
        echo
    } > "$REPORT_FILE"
    
    print_success "Package report created: $REPORT_FILE"
}

# Run post-build quality tests
run_quality_tests() {
    print_section "Running quality assurance tests"
    
    # Check package size
    print_task "Checking package size..."
    PACKAGE_SIZE=$(du -h "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" | cut -f1)
    echo "    Package size: $PACKAGE_SIZE"
    
    # Verify package contents
    print_task "Verifying package contents..."
    if ! dpkg -c "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" | grep -q "/usr/bin/$APP_NAME"; then
        print_warning "Binary not found in package"
    else
        print_success "Binary found in package"
    fi
    
    if ! dpkg -c "$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb" | grep -q "/usr/share/applications/$APP_NAME.desktop"; then
        print_warning "Desktop file not found in package"
    else
        print_success "Desktop file found in package"
    fi
    
    print_task "Package verification suggestions:"
    echo "    • Install on a clean system: sudo dpkg -i $DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb"
    echo "    • Verify desktop integration: check application appears in menu"
    echo "    • Test dependency resolution: sudo apt-get install -f"
    echo "    • Test uninstallation: sudo dpkg -r $APP_NAME"
    echo "    • Test purge: sudo dpkg -P $APP_NAME"
}

# Main function
main() {
    clear
    print_header
    
    # Process command line arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --sign-key=*)
                SIGN_KEY="${1#*=}"
                shift
                ;;
            --version=*)
                VERSION="${1#*=}"
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --sign-key=KEY   GPG key ID to use for signing the package"
                echo "  --version=X.Y.Z  Set the package version (default: $VERSION)"
                echo "  --help           Show this help message"
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    print_section "Production Package Build Process Started"
    echo "  • Package: $APP_NAME"
    echo "  • Version: $VERSION"
    echo "  • Target:  Ubuntu 20.04 LTS+ (amd64)"
    
    # Run build steps
    check_dependencies
    setup_directories
    build_core
    build_gui
    create_package_structure
    create_debian_control
    build_deb_package
    sign_package
    create_package_report
    run_quality_tests
    
    # Print success message
    echo -e "\n${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}║${BOLD}    Production Package Created Successfully!         ${NC}${GREEN}║${NC}"
    echo -e "${GREEN}║                                                        ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo -e ""
    echo -e "Package: ${BOLD}$DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb${NC}"
    echo -e "Report:  ${BOLD}$DIST_DIR/package-report.txt${NC}"
    echo -e ""
    echo -e "To install the package:"
    echo -e "  sudo dpkg -i $DIST_DIR/${APP_NAME}_${VERSION}_amd64.deb"
    echo -e "  sudo apt-get install -f  # Install any missing dependencies"
    echo -e ""
    
    return 0
}

# Run the main function
main "$@" 