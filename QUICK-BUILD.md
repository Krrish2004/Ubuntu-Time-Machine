# Ubuntu Time Machine - Quick Build Reference

This quick reference guide provides the essential commands to build a production-ready package for Ubuntu Time Machine.

## Prerequisites

Ensure all required dependencies are installed:

```bash
# Install essential build dependencies
sudo apt-get update && sudo apt-get install -y \
  cmake make g++ dpkg-dev fakeroot lintian \
  debhelper dh-make git curl wget

# Install Node.js and npm if not already installed
sudo apt-get install -y nodejs npm

# Install Electron tools globally
sudo npm install -g electron electron-builder
```

## Quick Build Commands

### 1. Clean build environment

```bash
# Clean previous build artifacts
rm -rf build/ dist/ packaging/ release/
```

### 2. Production build (unsigned)

```bash
# Run the production build script
./build-production.sh
```

### 3. Production build with specific version

```bash
# Set version to 1.2.3 and build
./build-production.sh --version=1.2.3
```

### 4. Production build with signing

```bash
# Sign the package with your GPG key
./build-production.sh --sign-key=YOUR_GPG_KEY_ID
```

### 5. Production build with version and signing

```bash
# Set version and sign the package
./build-production.sh --version=1.2.3 --sign-key=YOUR_GPG_KEY_ID
```

## Verify the Package

After building, you can verify the package:

```bash
# Check package metadata
dpkg-deb -I dist/ubuntu-time-machine_*_amd64.deb

# List package contents
dpkg-deb -c dist/ubuntu-time-machine_*_amd64.deb

# Verify package with lintian
lintian --pedantic dist/ubuntu-time-machine_*_amd64.deb
```

## Install and Test

```bash
# Install the package
sudo dpkg -i dist/ubuntu-time-machine_*_amd64.deb

# Install dependencies if needed
sudo apt-get install -f

# Launch the application
ubuntu-time-machine
```

## Distribution

```bash
# Generate checksums
cd dist/
md5sum ubuntu-time-machine_*_amd64.deb > ubuntu-time-machine_checksums.md5
sha256sum ubuntu-time-machine_*_amd64.deb > ubuntu-time-machine_checksums.sha256

# Create a release archive
VERSION=$(dpkg-deb -f ubuntu-time-machine_*_amd64.deb Version | cut -d'-' -f1)
mkdir -p ../release/ubuntu-time-machine-${VERSION}
cp ubuntu-time-machine_*_amd64.deb ../release/ubuntu-time-machine-${VERSION}/
cp *checksums.* ../release/ubuntu-time-machine-${VERSION}/
cd ../release
tar -czvf ubuntu-time-machine-${VERSION}.tar.gz ubuntu-time-machine-${VERSION}/
```

For complete documentation on the production packaging process, please refer to:
- `PACKAGING.md` - Detailed packaging documentation
- `PRODUCTION-RELEASE.md` - Comprehensive release process guide 