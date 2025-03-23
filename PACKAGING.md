# Ubuntu Time Machine - Production Packaging Guide

This document outlines the process for creating production-ready packages of Ubuntu Time Machine for distribution.

## Package Overview

Ubuntu Time Machine is packaged as a standard Debian package (`.deb`) with the following characteristics:

- **Package Name:** ubuntu-time-machine
- **Target Platform:** Ubuntu 20.04 LTS and newer
- **Architecture:** amd64
- **License:** GPL-3.0

## Prerequisites

Before creating a production package, ensure you have the following tools installed:

### Essential Build Tools
- `cmake` - For building the C++ components
- `make` - GNU Make build system
- `g++` - GNU C++ compiler
- `dpkg-deb` - For creating the Debian package
- `fakeroot` - For simulating root permissions during packaging
- `lintian` - For Debian package verification
- `strip` - For removing debug symbols

### Node.js and Electron Tools
- `node` - Node.js runtime
- `npm` - Node.js package manager
- `electron` - Electron framework
- `electron-builder` - For packaging Electron applications

### Debian Packaging Tools
- `debhelper` - Helper programs for debian/rules
- `dh_make` - Tool for creating Debian package skeletons

You can install most of these dependencies on Ubuntu with:

```bash
sudo apt-get update
sudo apt-get install cmake make g++ dpkg-dev fakeroot lintian debhelper dh-make
sudo npm install -g electron electron-builder
```

## Package Structure

The production package adheres to the Debian packaging standards with the following structure:

```
ubuntu-time-machine_1.0.0_amd64.deb
├── DEBIAN/
│   ├── control         # Package metadata
│   ├── md5sums         # Checksums of installed files
│   ├── postinst        # Post-installation script
│   └── postrm          # Post-removal script
└── usr/
    ├── bin/
    │   ├── ubuntu-time-machine   # Main executable
    │   └── utm-core              # Core binary
    ├── lib/
    │   └── ubuntu-time-machine/  # Application files
    │       ├── libutm_core.so    # Core library
    │       └── [Electron app files]
    └── share/
        ├── applications/
        │   └── ubuntu-time-machine.desktop  # Desktop entry
        ├── doc/
        │   └── ubuntu-time-machine/         # Documentation
        ├── icons/
        │   └── hicolor/                     # Application icons
        └── man/
            └── man1/                        # Man pages
```

## Build Process

The production build process is fully automated using the `build-production.sh` script, which performs the following steps:

1. **Environment Preparation:**
   - Verifies all required tools are installed
   - Sets up clean build directories
   - Configures build environment variables

2. **Core Engine Build:**
   - Compiles the C++ components with full optimizations (`-O3`, `-flto`)
   - Strips debug symbols to minimize binary size
   - Ensures proper linking with shared libraries

3. **GUI Build:**
   - Builds the Electron application with production settings
   - Minifies JavaScript and CSS assets
   - Bundles only production dependencies

4. **Package Creation:**
   - Creates a compliant Debian package structure
   - Generates all required metadata and control files
   - Properly handles permissions and file ownership
   - Creates desktop integration files (icons, .desktop)
   - Adds appropriate man pages and documentation

5. **Quality Assurance:**
   - Verifies package with Lintian for Debian compliance
   - Generates checksums for all files
   - Validates package contents
   - Creates a comprehensive build report

6. **Optional Signing:**
   - Can sign the package with a GPG key if provided

## Usage Instructions

To create a production package:

1. Ensure all prerequisites are installed
2. Navigate to the project root directory
3. Run the build script:

```bash
./build-production.sh
```

### Script Options

The build script accepts several command-line options:

- `--version=X.Y.Z` - Specify the package version (default: 1.0.0)
- `--sign-key=KEY` - Provide a GPG key ID for signing the package
- `--help` - Display help information

Example with options:

```bash
./build-production.sh --version=1.2.3 --sign-key=ABCD1234
```

## Output Files

After a successful build, the following files will be created:

- `dist/ubuntu-time-machine_1.0.0_amd64.deb` - The installable Debian package
- `dist/package-report.txt` - A detailed report of the package contents and metadata

## Installation Testing

After building, test the package on a clean Ubuntu system:

1. Install the package:
   ```bash
   sudo dpkg -i ubuntu-time-machine_1.0.0_amd64.deb
   sudo apt-get install -f  # Install any missing dependencies
   ```

2. Verify the installation:
   - Check the application appears in the Applications menu
   - Launch the application from the menu and command line
   - Test backup and restore functionality
   - Confirm desktop integration (icons, file associations)

3. Test removal:
   ```bash
   sudo dpkg -r ubuntu-time-machine  # Remove
   sudo dpkg -P ubuntu-time-machine  # Purge
   ```

## Distribution Considerations

When distributing the package:

1. **Repository Integration:**
   - Consider setting up a PPA or APT repository for easier distribution
   - Create Release and InRelease files with appropriate signatures

2. **Updates:**
   - Implement a proper update mechanism using `electron-updater`
   - Document the update process for users

3. **Signing:**
   - Always sign packages for production distribution
   - Publish your signing key to key servers

4. **System Integration:**
   - Test with different desktop environments (GNOME, KDE, XFCE)
   - Ensure proper handling of system permissions

## Troubleshooting

If you encounter issues during the packaging process:

1. Check the build log for specific errors
2. Use `lintian` for detailed package validation:
   ```bash
   lintian --pedantic -E ubuntu-time-machine_1.0.0_amd64.deb
   ```
3. Test the package contents:
   ```bash
   dpkg-deb -c ubuntu-time-machine_1.0.0_amd64.deb
   ```
4. Validate control information:
   ```bash
   dpkg-deb -I ubuntu-time-machine_1.0.0_amd64.deb
   ```

## Further Resources

- [Debian New Maintainers' Guide](https://www.debian.org/doc/manuals/maint-guide/)
- [Debian Policy Manual](https://www.debian.org/doc/debian-policy/)
- [Electron Builder Documentation](https://www.electron.build/)
- [Ubuntu Packaging Guide](https://packaging.ubuntu.com/html/) 