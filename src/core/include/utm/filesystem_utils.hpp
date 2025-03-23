/**
 * @file filesystem_utils.hpp
 * @brief Filesystem utilities for the Ubuntu Time Machine
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#pragma once

#include <filesystem>
#include <string>
#include <vector>
#include <optional>
#include <functional>
#include <chrono>

namespace utm {
namespace fs {

/**
 * @brief Information about a file
 */
struct FileInfo {
    std::filesystem::path path;                        ///< Path to the file
    std::filesystem::file_status status;               ///< File status
    std::uintmax_t size;                               ///< File size in bytes
    std::filesystem::file_time_type lastModified;      ///< Last modified time
    std::optional<std::string> checksum;               ///< File checksum (if available)
    bool isSymlink;                                    ///< Whether the file is a symlink
    std::optional<std::filesystem::path> symlinkTarget; ///< Target of symlink
};

/**
 * @brief Type of callback for file scanning
 */
using ScanCallback = std::function<bool(const FileInfo&)>;

/**
 * @brief Scans directories recursively
 * @param paths Paths to scan
 * @param excludePatterns Glob patterns to exclude
 * @param callback Callback function called for each file
 * @return Number of files scanned
 */
std::size_t scanDirectories(
    const std::vector<std::filesystem::path>& paths,
    const std::vector<std::string>& excludePatterns,
    ScanCallback callback);

/**
 * @brief Checks if a path matches any of the exclude patterns
 * @param path Path to check
 * @param excludePatterns Glob patterns to exclude
 * @return true if the path should be excluded, false otherwise
 */
bool isExcluded(
    const std::filesystem::path& path,
    const std::vector<std::string>& excludePatterns);

/**
 * @brief Calculates the checksum of a file
 * @param path Path to the file
 * @param algorithm Algorithm to use ("sha256", "md5", etc.)
 * @return Checksum of the file
 */
std::string calculateChecksum(
    const std::filesystem::path& path,
    const std::string& algorithm = "sha256");

/**
 * @brief Creates a hardlink if possible, falls back to copy if not
 * @param source Source file path
 * @param destination Destination file path
 * @return true if operation succeeded, false otherwise
 */
bool hardlinkOrCopy(
    const std::filesystem::path& source,
    const std::filesystem::path& destination);

/**
 * @brief Creates all backup directory structure
 * @param backupRoot Backup root directory
 * @param timestamp Timestamp for the backup
 * @return Path to the created backup directory
 */
std::filesystem::path createBackupDirectories(
    const std::filesystem::path& backupRoot,
    const std::chrono::system_clock::time_point& timestamp);

/**
 * @brief Gets the backup path for a specific timestamp
 * @param backupRoot Backup root directory
 * @param timestamp Timestamp for the backup
 * @return Path to the backup directory
 */
std::filesystem::path getBackupPath(
    const std::filesystem::path& backupRoot,
    const std::chrono::system_clock::time_point& timestamp);

/**
 * @brief Gets the latest backup path
 * @param backupRoot Backup root directory
 * @return Path to the latest backup directory, empty if none exists
 */
std::optional<std::filesystem::path> getLatestBackupPath(
    const std::filesystem::path& backupRoot);

/**
 * @brief Lists all backups in chronological order
 * @param backupRoot Backup root directory
 * @return Vector of backup timestamps
 */
std::vector<std::chrono::system_clock::time_point> listBackups(
    const std::filesystem::path& backupRoot);

/**
 * @brief Gets the total and free space on a filesystem
 * @param path Path on the filesystem to check
 * @param totalBytes Output parameter for total bytes
 * @param freeBytes Output parameter for free bytes
 * @return true if operation succeeded, false otherwise
 */
bool getFilesystemSpace(
    const std::filesystem::path& path,
    std::uintmax_t& totalBytes,
    std::uintmax_t& freeBytes);

} // namespace fs
} // namespace utm 