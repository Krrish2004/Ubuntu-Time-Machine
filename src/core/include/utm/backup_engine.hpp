/**
 * @file backup_engine.hpp
 * @brief Main header for the Ubuntu Time Machine backup engine
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <filesystem>
#include <chrono>
#include <optional>
#include <mutex>
#include <thread>
#include <atomic>
#include <condition_variable>

namespace utm {

/**
 * @brief Status of a backup operation
 */
enum class BackupStatus {
    IDLE,
    SCANNING,
    BACKING_UP,
    VERIFYING,
    COMPLETED,
    FAILED,
    CANCELLED
};

/**
 * @brief Configuration for a backup operation
 */
struct BackupConfig {
    std::vector<std::filesystem::path> sourcePaths;       ///< Paths to backup
    std::filesystem::path destinationPath;               ///< Destination path
    std::vector<std::string> excludePatterns;            ///< Patterns to exclude
    bool useCompression = false;                         ///< Whether to use compression
    std::optional<std::string> encryptionKey;            ///< Optional encryption key
    bool verifyBackup = true;                            ///< Whether to verify backup
    bool useHardLinks = true;                            ///< Whether to use hard links for deduplication
    int compressionLevel = 6;                            ///< Compression level (0-9)
    int threadCount = 0;                                 ///< Thread count (0 = auto)
};

/**
 * @brief Statistics about a backup operation
 */
struct BackupStats {
    size_t totalFiles = 0;                               ///< Total files processed
    size_t totalDirectories = 0;                         ///< Total directories processed
    size_t totalSize = 0;                                ///< Total size in bytes
    size_t processedFiles = 0;                           ///< Files processed so far
    size_t processedSize = 0;                            ///< Size processed so far
    size_t newFiles = 0;                                 ///< New files in this backup
    size_t modifiedFiles = 0;                            ///< Modified files in this backup
    size_t unchangedFiles = 0;                           ///< Unchanged files in this backup
    size_t skippedFiles = 0;                             ///< Skipped files
    std::chrono::system_clock::time_point startTime;     ///< Start time
    std::optional<std::chrono::system_clock::time_point> endTime; ///< End time
    double compressionRatio = 1.0;                       ///< Compression ratio achieved
    size_t dedupSavings = 0;                             ///< Storage saved by deduplication
};

/**
 * @brief Callback type for progress updates during backup
 */
using ProgressCallback = std::function<void(BackupStatus status, const BackupStats& stats)>;

/**
 * @brief Main backup engine class responsible for backup operations
 */
class BackupEngine {
public:
    /**
     * @brief Constructor
     */
    BackupEngine();

    /**
     * @brief Destructor
     */
    ~BackupEngine();

    /**
     * @brief Initializes the backup engine
     * @param metadataPath Path to store metadata
     * @return true if initialization succeeded, false otherwise
     */
    bool initialize(const std::filesystem::path& metadataPath);

    /**
     * @brief Starts a backup operation
     * @param config Backup configuration
     * @param progressCallback Callback for progress updates
     * @return true if backup started successfully, false otherwise
     */
    bool startBackup(const BackupConfig& config, ProgressCallback progressCallback);

    /**
     * @brief Cancels the current backup operation
     * @return true if cancellation succeeded, false otherwise
     */
    bool cancelBackup();

    /**
     * @brief Gets the current backup status
     * @return Current backup status
     */
    BackupStatus getStatus() const;

    /**
     * @brief Gets the current backup statistics
     * @return Current backup statistics
     */
    BackupStats getStats() const;

    /**
     * @brief Lists available backups
     * @param destination Backup destination path
     * @return Vector of backup timestamps
     */
    std::vector<std::chrono::system_clock::time_point> listBackups(
        const std::filesystem::path& destination) const;

    /**
     * @brief Removes old backups according to retention policy
     * @param destination Backup destination path
     * @param keepDaily Number of daily backups to keep
     * @param keepWeekly Number of weekly backups to keep
     * @param keepMonthly Number of monthly backups to keep
     * @return true if pruning succeeded, false otherwise
     */
    bool pruneBackups(
        const std::filesystem::path& destination,
        int keepDaily,
        int keepWeekly,
        int keepMonthly);

private:
    class Impl;
    std::unique_ptr<Impl> pImpl;
};

/**
 * @brief Class for restoring files from backups
 */
class RestoreEngine {
public:
    /**
     * @brief Constructor
     */
    RestoreEngine();

    /**
     * @brief Destructor
     */
    ~RestoreEngine();

    /**
     * @brief Initialize the restore engine
     * @param backupPath Path to the backup
     * @return true if initialization succeeded, false otherwise
     */
    bool initialize(const std::filesystem::path& backupPath);

    /**
     * @brief Restore files from a backup
     * @param sourcePaths Paths within the backup to restore
     * @param destinationPath Destination to restore to
     * @param timestamp Timestamp of the backup to restore from
     * @param progressCallback Callback for progress updates
     * @return true if restore succeeded, false otherwise
     */
    bool restore(
        const std::vector<std::filesystem::path>& sourcePaths,
        const std::filesystem::path& destinationPath,
        const std::chrono::system_clock::time_point& timestamp,
        ProgressCallback progressCallback);

    /**
     * @brief List files in a backup
     * @param path Path within the backup
     * @param timestamp Timestamp of the backup
     * @return Vector of files in the backup
     */
    std::vector<std::filesystem::path> listFiles(
        const std::filesystem::path& path,
        const std::chrono::system_clock::time_point& timestamp);

private:
    class Impl;
    std::unique_ptr<Impl> pImpl;
};

} // namespace utm 