# Ubuntu Time Machine v2.0

A professional-grade backup solution for Ubuntu, inspired by Apple's Time Machine. This project provides a reliable, intuitive, and powerful backup system specifically designed for Ubuntu Linux.

## Features

- **Intuitive User Interface**: User-friendly Electron-based GUI with a modern Material UI design
- **Powerful Core Engine**: Written in C++ for maximum performance and reliability
- **Incremental Backups**: Save disk space with smart incremental backups
- **File Versioning**: Recover any version of your files from the backup history
- **Snapshot Browsing**: Browse backups like regular folders and restore files with ease
- **Backup Scheduling**: Set up automatic backups on your preferred schedule
- **Encryption Support**: Protect your backups with strong encryption
- **Compression Options**: Choose your preferred balance of speed vs. space savings
- **Command-Line Interface**: Powerful CLI for scripting and advanced usage
- **System Integration**: Notifications, status indicators, and more
- **Multiple Destinations**: Back up to external drives, network storage, or other locations

## System Requirements

- Ubuntu 20.04 LTS or newer
- Modern CPU with at least 2 cores
- 4 GB RAM minimum (8 GB recommended)
- Sufficient storage space for backups
- External drive, network storage, or other destination for backups

## Architecture

Ubuntu Time Machine consists of two main components:

1. **Core Engine**: A C++ application that handles the actual backup and restore operations
2. **User Interface**: An Electron-based GUI that provides a user-friendly interface

### Core Engine

The core engine is responsible for:
- File system monitoring and change detection
- Creating and managing backups (full and incremental)
- Efficient file storage and retrieval
- Database management for backup metadata
- Compression and encryption
- Scheduled operations

### User Interface

The Electron-based GUI provides:
- Dashboard with backup status and statistics
- Backup creation and configuration
- Restore interface with snapshot browsing
- Settings management
- System tray integration
- Notifications and alerts

## Installation

### From Package (Recommended)

```bash
# Install .deb package
sudo apt install ./ubuntu-time-machine_2.0.0_amd64.deb

# Or use the AppImage
chmod +x Ubuntu_Time_Machine-2.0.0.AppImage
./Ubuntu_Time_Machine-2.0.0.AppImage
```

### Building from Source

#### Prerequisites

```bash
# Install build dependencies
sudo apt install build-essential cmake libboost-all-dev libsqlite3-dev libssl-dev nodejs npm
```

#### Build Instructions

```bash
# Clone the repository
git clone https://github.com/ubuntu/ubuntu-time-machine.git
cd ubuntu-time-machine

# Build the core engine
mkdir -p build && cd build
cmake ..
make -j$(nproc)

# Build the GUI
cd ../src/gui
npm install
npm run build

# Run the application
npm start
```

## Usage

### Setting Up Your First Backup

1. Launch Ubuntu Time Machine
2. Click "Create Profile" to set up a new backup profile
3. Select the source directories you want to back up
4. Choose your backup destination
5. Configure your backup settings (compression, encryption, etc.)
6. Start your first backup

### Scheduling Backups

1. Open the Profiles page
2. Edit your backup profile
3. Enable scheduled backups
4. Choose your preferred schedule (hourly, daily, weekly, monthly)
5. Set the time for the backup to run

### Restoring Files

1. Go to the Restore page
2. Browse your backup history using the timeline view
3. Navigate to the desired files or folders
4. Select the items you want to restore
5. Choose your restore options and location
6. Click "Restore" to recover your files

## Command Line Interface

The CLI provides powerful options for scripting and advanced usage:

```bash
# List all backup profiles
ubuntu-time-machine list-profiles

# Create a backup using a specific profile
ubuntu-time-machine backup --profile=home_backup

# Restore files from a specific backup
ubuntu-time-machine restore --profile=home_backup --time="2023-05-15 14:30" --source="/home/user/Documents" --destination="/tmp/restored"

# Show backup history and statistics
ubuntu-time-machine history --profile=home_backup

# Verify the integrity of backups
ubuntu-time-machine verify --profile=home_backup
```

## Configuration

Configuration files are stored in:
- `/etc/ubuntu-time-machine/` - System configuration
- `~/.config/ubuntu-time-machine/` - User configuration

## Development

### Project Structure

```
ubuntu-time-machine/
├── CMakeLists.txt          # Main CMake configuration
├── README.md               # This file
├── docs/                   # Documentation
├── include/                # Header files
│   ├── backup/             # Backup management
│   ├── common/             # Common utilities
│   ├── config/             # Configuration management
│   ├── database/           # Database integration
│   ├── filesystem/         # Filesystem utilities
│   ├── logging/            # Logging system
│   └── system/             # System integration
├── src/                    # Source code
│   ├── core/               # Core engine code
│   ├── cli/                # Command-line interface
│   └── gui/                # Electron-based GUI
│       ├── src/              # Source files
│       │   ├── main/         # Main process
│       │   └── renderer/     # Renderer process
│       │       ├── components/  # React components
│       │       ├── pages/       # React pages
│       │       ├── services/    # Services
│       │       └── styles/      # CSS files
│       ├── package.json     # NPM package configuration
│       └── webpack.config.js # Webpack configuration
└── tests/                  # Test suite
```

### API Documentation

Full API documentation is available in the `docs/api` directory.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the LICENSE file for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## Support

- Documentation: [https://docs.ubuntutimemachine.org](https://docs.ubuntutimemachine.org)
- Issue Tracker: [GitHub Issues](https://github.com/ubuntu/ubuntu-time-machine/issues)
- Community Forums: [Ubuntu Forums](https://ubuntuforums.org/forumdisplay.php?f=338)

## Acknowledgements

- The Ubuntu community for their ongoing support
- Apple's Time Machine for inspiration
- All contributors to the project

---

*Ubuntu Time Machine is not affiliated with or endorsed by Apple Inc. or Canonical Ltd.* 