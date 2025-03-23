# Ubuntu Time Machine - Production Release Guide

This guide outlines the steps to create a production-ready release package for Ubuntu Time Machine.

## Pre-release Checklist

Before generating a production package, complete the following checklist:

- [ ] All features for this release are implemented and tested
- [ ] Unit tests are passing
- [ ] Integration tests are passing
- [ ] Documentation is updated
- [ ] Version numbers are updated in all relevant files
- [ ] Changelog is updated with all changes since the last release
- [ ] License and copyright information is current
- [ ] Third-party dependencies are documented and licenses verified

## Environment Setup

### 1. Set up a clean build environment

It's recommended to create a clean build environment to prevent contamination from development artifacts. You can use one of the following approaches:

#### Option A: Use a clean Docker container
```bash
docker run -it --rm -v $(pwd):/app ubuntu:20.04
cd /app
```

#### Option B: Create a clean build directory
```bash
mkdir -p ~/build-utm
cp -r /path/to/ubuntu-time-machine ~/build-utm/
cd ~/build-utm/ubuntu-time-machine
```

### 2. Install build dependencies

Make sure all required dependencies are installed:

```bash
# Update system packages
sudo apt-get update

# Install essential build tools
sudo apt-get install -y \
    cmake make g++ \
    dpkg-dev fakeroot lintian \
    debhelper dh-make \
    git curl wget

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Electron tools
sudo npm install -g electron electron-builder
```

## Step-by-Step Production Build

### 1. Set version information

Decide on the version number for this release following semantic versioning principles (MAJOR.MINOR.PATCH):

```bash
export UTM_VERSION="1.0.0"
```

Update version numbers in all relevant files:

```bash
# Update in package.json
sed -i "s/\"version\": \".*\"/\"version\": \"$UTM_VERSION\"/" src/gui/package.json

# Update in CMakeLists.txt
sed -i "s/project(ubuntu-time-machine VERSION .*)/project(ubuntu-time-machine VERSION $UTM_VERSION)/" CMakeLists.txt
```

### 2. Clean the workspace

Remove any existing build artifacts:

```bash
# Clean build directories
rm -rf build/ dist/ packaging/ release/
```

### 3. Run the production build script

The automated production build script handles all aspects of the packaging process:

```bash
./build-production.sh --version=$UTM_VERSION
```

If you have a GPG key for signing the package (recommended for production releases):

```bash
./build-production.sh --version=$UTM_VERSION --sign-key=YOUR_GPG_KEY_ID
```

This script will:
- Check for all required dependencies
- Build the C++ core with optimizations
- Build and optimize the Electron GUI
- Create a proper Debian package structure
- Generate all required metadata and control files
- Build the .deb package
- Optionally sign the package
- Create a package report

### 4. Verify the package

After the build completes, perform these verification steps:

```bash
# Check package metadata
dpkg-deb -I dist/ubuntu-time-machine_${UTM_VERSION}_amd64.deb

# List package contents
dpkg-deb -c dist/ubuntu-time-machine_${UTM_VERSION}_amd64.deb

# Verify package with lintian
lintian --pedantic -E dist/ubuntu-time-machine_${UTM_VERSION}_amd64.deb
```

## Testing the Production Package

### 1. Install on a clean system

For thorough testing, install and test the package on a clean Ubuntu system:

```bash
# Install the package
sudo dpkg -i dist/ubuntu-time-machine_${UTM_VERSION}_amd64.deb

# Install dependencies if needed
sudo apt-get install -f
```

### 2. Verify installation

Perform these verification steps:

- [ ] Application appears in the Applications menu
- [ ] Application icon is displayed properly
- [ ] Application launches from menu and command line
- [ ] All functionality works as expected
- [ ] System integration features work properly
- [ ] No error messages in logs

### 3. Test removal

Test the uninstallation process:

```bash
# Remove the package
sudo dpkg -r ubuntu-time-machine

# Verify removal
which ubuntu-time-machine  # Should return nothing

# Purge the package to remove configuration
sudo dpkg -P ubuntu-time-machine
```

## Distribution Process

Once the package has been verified, follow these steps for distribution:

### 1. Generate checksums

Create hash files for verification:

```bash
cd dist/
md5sum ubuntu-time-machine_${UTM_VERSION}_amd64.deb > ubuntu-time-machine_${UTM_VERSION}_amd64.deb.md5
sha256sum ubuntu-time-machine_${UTM_VERSION}_amd64.deb > ubuntu-time-machine_${UTM_VERSION}_amd64.deb.sha256
```

### 2. Create a release archive

Package everything needed for distribution:

```bash
mkdir -p release/ubuntu-time-machine-${UTM_VERSION}
cp dist/ubuntu-time-machine_${UTM_VERSION}_amd64.deb release/ubuntu-time-machine-${UTM_VERSION}/
cp dist/*.md5 dist/*.sha256 release/ubuntu-time-machine-${UTM_VERSION}/
cp README.md LICENSE CHANGELOG.md release/ubuntu-time-machine-${UTM_VERSION}/
cp -r docs/ release/ubuntu-time-machine-${UTM_VERSION}/docs/

# Create the archive
cd release/
tar -czvf ubuntu-time-machine-${UTM_VERSION}.tar.gz ubuntu-time-machine-${UTM_VERSION}/
```

### 3. Upload to distribution channels

Choose appropriate distribution channels:

- [ ] Upload to your website or download server
- [ ] Add to a PPA (Personal Package Archive) for Ubuntu
- [ ] Upload to a GitHub release
- [ ] Submit to the Ubuntu Software Center (if applicable)

### 4. Update release documentation

Update your website or documentation with:

- Release notes highlighting new features, improvements, and bug fixes
- Installation instructions
- Upgrade notes for existing users
- Known issues and workarounds

## Post-Release Tasks

After the release, complete these tasks:

- [ ] Tag the release in your version control system:
  ```bash
  git tag -a v${UTM_VERSION} -m "Release v${UTM_VERSION}"
  git push origin v${UTM_VERSION}
  ```

- [ ] Create a milestone for the next version in your issue tracker
- [ ] Move any unresolved issues to the next milestone
- [ ] Announce the release on appropriate channels
- [ ] Gather feedback and monitor for any critical issues

## Troubleshooting Production Issues

If users report issues with the production package:

1. Verify if the issue can be reproduced on a clean installation
2. Check system logs for error messages:
   ```bash
   journalctl -u ubuntu-time-machine
   ```
3. Check application logs:
   ```bash
   cat ~/.config/ubuntu-time-machine/logs/main.log
   ```
4. Consider releasing a hotfix if critical issues are found:
   ```bash
   # Increment the patch version
   export UTM_VERSION="1.0.1"
   # Follow the build process again
   ```

## Appendix: Continuous Integration

For automating production builds, consider setting up a CI/CD pipeline with:

- GitHub Actions
- GitLab CI
- Jenkins
- Travis CI

A basic GitHub Actions workflow file might look like:

```yaml
name: Production Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: |
        sudo apt-get update
        sudo apt-get install -y cmake make g++ dpkg-dev fakeroot lintian debhelper dh-make
        sudo npm install -g electron electron-builder
    
    - name: Build package
      run: |
        export UTM_VERSION=${GITHUB_REF#refs/tags/v}
        ./build-production.sh --version=$UTM_VERSION
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v2
      with:
        name: ubuntu-time-machine-package
        path: dist/ubuntu-time-machine_*.deb
``` 