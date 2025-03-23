/**
 * @file system_utils.hpp
 * @brief System utilities for Ubuntu Time Machine
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#pragma once

#include <string>
#include <vector>
#include <filesystem>
#include <optional>
#include <functional>

namespace utm {
namespace system {

/**
 * @brief System information
 */
struct SystemInfo {
    std::string hostname;                     ///< System hostname
    std::string osName;                       ///< Operating system name
    std::string osVersion;                    ///< Operating system version
    int cpuCores;                             ///< Number of CPU cores
    uint64_t totalMemory;                     ///< Total memory in bytes
    uint64_t freeMemory;                      ///< Free memory in bytes
    std::string username;                     ///< Current username
    uint32_t uid;                             ///< User ID
    uint32_t gid;                             ///< Group ID
    std::vector<std::string> groups;          ///< User groups
    bool isRoot;                              ///< Whether running as root
    bool hasSudo;                             ///< Whether user has sudo access
    bool isDesktopSession;                    ///< Whether in a desktop session
    std::optional<std::string> desktopEnv;    ///< Desktop environment if any
};

/**
 * @brief Get system information
 * @return System information
 */
SystemInfo getSystemInfo();

/**
 * @brief Check if running with root privileges
 * @return true if running as root, false otherwise
 */
bool isRunningAsRoot();

/**
 * @brief Get available mountpoints
 * @return List of available mountpoints
 */
std::vector<std::filesystem::path> getAvailableMountpoints();

/**
 * @brief Get information about a mountpoint
 * @param path Mountpoint path
 * @return Mountpoint information
 */
struct MountpointInfo {
    std::filesystem::path path;                ///< Mountpoint path
    std::string device;                        ///< Device path
    std::string fsType;                        ///< Filesystem type
    uint64_t totalSpace;                       ///< Total space in bytes
    uint64_t freeSpace;                        ///< Free space in bytes
    bool isRemovable;                          ///< Whether it's a removable device
    bool isNetworkMount;                       ///< Whether it's a network mount
    std::optional<std::string> label;          ///< Filesystem label if available
    std::optional<std::string> uuid;           ///< Filesystem UUID if available
};

/**
 * @brief Get information about a mountpoint
 * @param path Mountpoint path
 * @return Mountpoint information or nullopt if path is not a mountpoint
 */
std::optional<MountpointInfo> getMountpointInfo(const std::filesystem::path& path);

/**
 * @brief Check if a path is accessible with current permissions
 * @param path Path to check
 * @param needWrite Whether write access is needed
 * @return true if accessible, false otherwise
 */
bool isPathAccessible(const std::filesystem::path& path, bool needWrite = true);

/**
 * @brief Execute a command with elevated privileges if needed
 * @param command Command to execute
 * @param needRoot Whether root privileges are needed
 * @param outputCallback Callback for command output
 * @return Exit code of the command
 */
int executeCommand(
    const std::string& command,
    bool needRoot = false,
    std::function<void(const std::string&)> outputCallback = nullptr);

/**
 * @brief Send a desktop notification
 * @param title Notification title
 * @param message Notification message
 * @param icon Icon name or path
 * @param urgency Urgency level ("low", "normal", "critical")
 * @return true if notification was sent, false otherwise
 */
bool sendNotification(
    const std::string& title,
    const std::string& message,
    const std::string& icon = "ubuntu-time-machine",
    const std::string& urgency = "normal");

/**
 * @brief Check if the system is running on battery
 * @return true if running on battery, false if on AC power or unknown
 */
bool isRunningOnBattery();

/**
 * @brief Check if a network connection is metered
 * @return true if connection is metered, false otherwise
 */
bool isNetworkMetered();

/**
 * @brief Get the system's default application data directory
 * @return Path to the application data directory
 */
std::filesystem::path getAppDataDirectory();

/**
 * @brief Get the system's default cache directory
 * @return Path to the cache directory
 */
std::filesystem::path getCacheDirectory();

/**
 * @brief Get the system's default temporary directory
 * @return Path to the temporary directory
 */
std::filesystem::path getTempDirectory();

/**
 * @brief Get the current system load
 * @return System load average (1, 5, 15 minutes)
 */
std::tuple<double, double, double> getSystemLoad();

/**
 * @brief Get the current CPU usage percentage
 * @return CPU usage percentage (0-100)
 */
double getCpuUsage();

/**
 * @brief Check if the system supports systemd
 * @return true if systemd is supported, false otherwise
 */
bool hasSystemd();

/**
 * @brief Check if a systemd service exists
 * @param serviceName Service name
 * @return true if service exists, false otherwise
 */
bool systemdServiceExists(const std::string& serviceName);

/**
 * @brief Check if a systemd service is running
 * @param serviceName Service name
 * @return true if service is running, false otherwise
 */
bool isSystemdServiceRunning(const std::string& serviceName);

/**
 * @brief Start a systemd service
 * @param serviceName Service name
 * @return true if service was started, false otherwise
 */
bool startSystemdService(const std::string& serviceName);

/**
 * @brief Stop a systemd service
 * @param serviceName Service name
 * @return true if service was stopped, false otherwise
 */
bool stopSystemdService(const std::string& serviceName);

/**
 * @brief Enable a systemd service to start on boot
 * @param serviceName Service name
 * @return true if service was enabled, false otherwise
 */
bool enableSystemdService(const std::string& serviceName);

/**
 * @brief Disable a systemd service from starting on boot
 * @param serviceName Service name
 * @return true if service was disabled, false otherwise
 */
bool disableSystemdService(const std::string& serviceName);

/**
 * @brief Get a unique hardware identifier for this machine
 * @return A string that uniquely identifies this hardware
 */
std::string getHardwareIdentifier();

} // namespace system
} // namespace utm