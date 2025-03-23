/**
 * @file database.hpp
 * @brief Database manager for Ubuntu Time Machine
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#pragma once

#include <string>
#include <vector>
#include <memory>
#include <chrono>
#include <filesystem>
#include <optional>
#include <mutex>

namespace utm {

/**
 * @brief File record in the database
 */
struct FileRecord {
    std::int64_t id = 0;                                 ///< Unique ID
    std::filesystem::path path;                          ///< Path relative to backup root
    std::string checksum;                                ///< File checksum
    std::uintmax_t size = 0;                             ///< File size in bytes
    std::filesystem::file_time_type modificationTime;    ///< Modification time
    std::chrono::system_clock::time_point backupTime;    ///< When it was backed up
    std::optional<std::filesystem::path> hardlinkTarget; ///< Target if hardlinked
    bool isSymlink = false;                              ///< Whether it's a symlink
    std::optional<std::filesystem::path> symlinkTarget;  ///< Target if symlink
    bool isCompressed = false;                           ///< Whether it's compressed
    bool isEncrypted = false;                            ///< Whether it's encrypted
};

/**
 * @brief Backup session record
 */
struct BackupSession {
    std::int64_t id = 0;                                  ///< Unique ID
    std::chrono::system_clock::time_point startTime;      ///< Start time
    std::optional<std::chrono::system_clock::time_point> endTime; ///< End time
    std::filesystem::path sourcePath;                     ///< Source path
    std::filesystem::path destinationPath;                ///< Destination path
    bool isComplete = false;                              ///< Whether the backup is complete
    bool isVerified = false;                              ///< Whether the backup is verified
    int totalFiles = 0;                                   ///< Total number of files
    std::uintmax_t totalSize = 0;                         ///< Total size in bytes
};

/**
 * @brief Database manager for the backup system
 */
class Database {
public:
    /**
     * @brief Constructor
     */
    Database();

    /**
     * @brief Destructor
     */
    ~Database();

    /**
     * @brief Open a database
     * @param path Path to the database file
     * @return true if successful, false otherwise
     */
    bool open(const std::filesystem::path& path);

    /**
     * @brief Close the database
     */
    void close();

    /**
     * @brief Begin a transaction
     * @return true if successful, false otherwise
     */
    bool beginTransaction();

    /**
     * @brief Commit the current transaction
     * @return true if successful, false otherwise
     */
    bool commitTransaction();

    /**
     * @brief Rollback the current transaction
     * @return true if successful, false otherwise
     */
    bool rollbackTransaction();

    /**
     * @brief Create a new backup session
     * @param session Backup session info
     * @return ID of the created session, or -1 on failure
     */
    std::int64_t createBackupSession(const BackupSession& session);

    /**
     * @brief Update a backup session
     * @param session Backup session to update
     * @return true if successful, false otherwise
     */
    bool updateBackupSession(const BackupSession& session);

    /**
     * @brief Get a backup session by ID
     * @param id Session ID
     * @return Session record, or nullopt if not found
     */
    std::optional<BackupSession> getBackupSession(std::int64_t id);

    /**
     * @brief Get all backup sessions
     * @return Vector of all backup sessions
     */
    std::vector<BackupSession> getAllBackupSessions();

    /**
     * @brief Add a file record
     * @param record File record to add
     * @param sessionId Session ID to associate with
     * @return ID of the created record, or -1 on failure
     */
    std::int64_t addFileRecord(const FileRecord& record, std::int64_t sessionId);

    /**
     * @brief Get a file record by path and session
     * @param path File path
     * @param sessionId Session ID
     * @return File record, or nullopt if not found
     */
    std::optional<FileRecord> getFileRecord(
        const std::filesystem::path& path, 
        std::int64_t sessionId);

    /**
     * @brief Find file records by checksum
     * @param checksum File checksum
     * @return Vector of matching file records
     */
    std::vector<FileRecord> findFilesByChecksum(const std::string& checksum);

    /**
     * @brief Get all file records for a session
     * @param sessionId Session ID
     * @return Vector of file records
     */
    std::vector<FileRecord> getSessionFiles(std::int64_t sessionId);

    /**
     * @brief Get history of a file across sessions
     * @param path File path
     * @return Vector of file records across all sessions
     */
    std::vector<FileRecord> getFileHistory(const std::filesystem::path& path);

    /**
     * @brief Delete a backup session and all associated files
     * @param sessionId Session ID
     * @return true if successful, false otherwise
     */
    bool deleteBackupSession(std::int64_t sessionId);

private:
    class Impl;
    std::unique_ptr<Impl> pImpl;
};

} // namespace utm 