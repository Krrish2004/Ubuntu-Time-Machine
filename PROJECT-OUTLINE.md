# Ubuntu Time Machine Project Outline

This document provides a structured outline of the project's key files and their absolute paths.

## Project Root

- `/home/krrish/TM/~/TM/ubuntu-time-machine/CMakeLists.txt` - Main CMake build configuration
- `/home/krrish/TM/~/TM/ubuntu-time-machine/LICENSE` - Project license
- `/home/krrish/TM/~/TM/ubuntu-time-machine/README.md` - Project overview and instructions
- `/home/krrish/TM/~/TM/ubuntu-time-machine/GUI-SUMMARY.md` - GUI component summary
- `/home/krrish/TM/~/TM/ubuntu-time-machine/PROJECT-STATUS.md` - Project status tracking
- `/home/krrish/TM/~/TM/ubuntu-time-machine/run-dev.sh` - Development environment setup script

## Core Component

### Build Configuration

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/CMakeLists.txt` - Core component build configuration

### Headers

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/include/utm/config.hpp` - Configuration settings
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/include/utm/backup_engine.hpp` - Backup engine implementation
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/include/utm/database.hpp` - Database interface
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/include/utm/filesystem_utils.hpp` - Filesystem utilities
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/include/utm/logging.hpp` - Logging functionality
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/include/utm/system_utils.hpp` - System utilities

### Source

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/src/main.cpp` - Core application entry point
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/src/stub.cpp` - Stub implementation for development

### Tests

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/core/tests/CMakeLists.txt` - Test build configuration

## GUI Component

### Configuration

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/package.json` - NPM package configuration
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/webpack.config.js` - Webpack build configuration
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/tsconfig.json` - TypeScript configuration

### Main Process (Electron)

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/main/index.ts` - Main Electron process
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/main/preload.ts` - Preload script for bridge functionality

### Renderer Process (React)

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/index.html` - HTML template
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/index.tsx` - React entry point
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/App.tsx` - Main React application component
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/styles/global.css` - Global CSS styles
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/types/global.d.ts` - TypeScript declarations

### React Pages

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/pages/DashboardPage.tsx` - Dashboard page
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/pages/BackupPage.tsx` - Backup management page
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/pages/RestorePage.tsx` - Restore functionality page
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/pages/ProfilesPage.tsx` - Backup profiles page
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/pages/SettingsPage.tsx` - Settings page

### Services

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/src/renderer/services/BackupService.ts` - Backup service implementation

### Distribution

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/dist/` - Compiled application files
- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/dist/simple-main.js` - Simplified main process for development

## CLI Component

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/cli/CMakeLists.txt` - CLI build configuration

## System Integration

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/system_integration/CMakeLists.txt` - System integration build configuration

## Assets

- `/home/krrish/TM/~/TM/ubuntu-time-machine/src/gui/assets/icons/16x16.png` - Application icon 