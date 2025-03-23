# Ubuntu Time Machine Installation Guide

This document provides instructions for installing, configuring, and troubleshooting Ubuntu Time Machine.

## System Requirements

- Ubuntu 20.04 or later (also compatible with Debian-based distributions)
- At least 100MB of free disk space for the application
- Additional free space for backups (dependent on data size)
- Node.js 14.0 or later
- Systemd

## Installation Methods

### Method 1: Installing the Debian Package

1. Download the latest `.deb` package from our releases page
2. Install the package with:
   ```bash
   sudo dpkg -i ubuntu-time-machine_2.0.0_amd64.deb
   ```
3. If there are dependency issues, resolve them with:
   ```bash
   sudo apt-get install -f
   ```

### Method 2: Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/ubuntutimemachine/ubuntu-time-machine.git
   cd ubuntu-time-machine
   ```

2. Run the package build script:
   ```bash
   ./build-package.sh
   ```

3. Install the generated package from the `release` directory:
   ```bash
   sudo dpkg -i release/ubuntu-time-machine_2.0.0_amd64.deb
   ```

## Post-Installation Configuration

### Application Configuration

1. The main configuration file is located at `/etc/ubuntu-time-machine/daemon.conf`
2. Edit this file to customize backup intervals, compression levels, and other settings:
   ```bash
   sudo nano /etc/ubuntu-time-machine/daemon.conf
   ```

### Starting the Backup Service

The backup service is installed but not automatically started to allow for configuration first. To start the service:

```bash
sudo systemctl start ubuntu-time-machine.service
```

To enable the service to start on boot:

```bash
sudo systemctl enable ubuntu-time-machine.service
```

## Using Ubuntu Time Machine

1. Launch the application from your applications menu or run `ubuntu-time-machine` from the terminal
2. The GUI will guide you through setting up your first backup profile
3. Configure your backup sources, destinations, and schedules

## Uninstallation

To uninstall Ubuntu Time Machine:

```bash
sudo apt remove ubuntu-time-machine
```

To completely remove all configuration files as well:

```bash
sudo apt purge ubuntu-time-machine
```

## Troubleshooting

### Common Issues

#### The application doesn't start

1. Check if Node.js is installed:
   ```bash
   node --version
   ```
2. Verify the installation path:
   ```bash
   ls -la /usr/bin/ubuntu-time-machine
   ```
3. Check application logs:
   ```bash
   cat /var/log/ubuntu-time-machine/gui.log
   ```

#### Backup service is not running

1. Check the service status:
   ```bash
   sudo systemctl status ubuntu-time-machine.service
   ```
2. Look for errors in the service log:
   ```bash
   sudo journalctl -u ubuntu-time-machine.service
   ```
3. Verify daemon configuration:
   ```bash
   cat /etc/ubuntu-time-machine/daemon.conf
   ```

#### Permission issues

1. Check directory permissions:
   ```bash
   ls -la /var/lib/ubuntu-time-machine
   ls -la /etc/ubuntu-time-machine
   ```
2. Ensure the backup destination is writable by the service

## Support

If you encounter issues not covered by this guide, please:

1. Check our [GitHub issues](https://github.com/ubuntutimemachine/ubuntu-time-machine/issues)
2. Submit a new issue with detailed information about your problem
3. Contact our support team at support@ubuntutimemachine.org

## For Package Maintainers

If you're maintaining this package for a distribution:

1. The main executables are installed to `/usr/bin/`
2. Configuration files are in `/etc/ubuntu-time-machine/`
3. Library files are in `/usr/lib/`
4. Application data is in `/usr/share/ubuntu-time-machine/`
5. Log files are stored in `/var/log/ubuntu-time-machine/`
6. The systemd service file is installed to `/usr/lib/systemd/system/` 