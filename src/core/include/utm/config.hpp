/**
 * @file config.hpp
 * @brief Configuration manager for Ubuntu Time Machine
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#pragma once

#include <string>
#include <vector>
#include <map>
#include <filesystem>
#include <memory>
#include <optional>
#include <chrono>
#include <any>
#include <functional>
#include "logging.hpp"  // Include the logging header for LogLevel type

namespace utm {

/**
 * @brief Represents schedule type for backups
 */
enum class ScheduleType {
    HOURLY,
    DAILY,
    WEEKLY,
    MONTHLY,
    CUSTOM
};

/**
 * @brief Configuration for a backup schedule
 */
struct ScheduleConfig {
    ScheduleType type = ScheduleType::DAILY;              ///< Schedule type
    std::chrono::system_clock::time_point startTime;      ///< Initial start time
    std::chrono::hours interval = std::chrono::hours(24); ///< Interval for custom schedules
    int dayOfWeek = 1;                                    ///< Day of week for weekly (0=Sunday)
    int dayOfMonth = 1;                                   ///< Day of month for monthly
    bool enabled = true;                                  ///< Whether the schedule is enabled
};

/**
 * @brief Retention policy for backup rotation
 */
struct RetentionPolicy {
    int keepDaily = 7;                                    ///< Keep daily backups for 7 days
    int keepWeekly = 4;                                   ///< Keep weekly backups for 4 weeks
    int keepMonthly = 12;                                 ///< Keep monthly backups for 12 months
    int keepYearly = 5;                                   ///< Keep yearly backups for 5 years
    bool autoDelete = true;                               ///< Automatically delete old backups
};

/**
 * @brief Configuration for a backup profile
 */
struct BackupProfile {
    std::string name;                                     ///< Profile name
    std::vector<std::filesystem::path> sourcePaths;       ///< Source paths
    std::filesystem::path destinationPath;                ///< Destination path
    std::vector<std::string> excludePatterns;             ///< Patterns to exclude
    bool useCompression = false;                          ///< Whether to use compression
    int compressionLevel = 6;                             ///< Compression level (0-9)
    bool useEncryption = false;                           ///< Whether to use encryption
    std::string encryptionMethod;                         ///< Encryption method
    bool verifyBackup = true;                             ///< Whether to verify backups
    bool useHardLinks = true;                             ///< Whether to use hard links
    int threadCount = 0;                                  ///< Thread count (0 = auto)
    ScheduleConfig schedule;                              ///< Backup schedule
    RetentionPolicy retention;                            ///< Retention policy
};

/**
 * @brief General application configuration
 */
struct ApplicationConfig {
    std::filesystem::path logDirectory;                   ///< Log directory
    LogLevel logLevel = LogLevel::INFO;                   ///< Default log level
    std::string defaultLanguage = "en";                   ///< Default language
    bool checkUpdates = true;                             ///< Whether to check for updates
    bool darkTheme = false;                               ///< Whether to use dark theme
    bool minimizeToTray = true;                           ///< Whether to minimize to tray
    bool showNotifications = true;                        ///< Whether to show notifications
    bool startMinimized = false;                          ///< Whether to start minimized
    bool autoStart = false;                               ///< Whether to start on boot
    bool limitCpuUsage = true;                            ///< Whether to limit CPU usage
    int maxCpuPercentage = 50;                            ///< Maximum CPU percentage
    bool pauseOnBattery = true;                           ///< Whether to pause on battery
    bool pauseOnMeteredConnection = true;                 ///< Whether to pause on metered connection
    size_t maxLogSize = 10 * 1024 * 1024;                 ///< Maximum log size (10 MB)
    int maxLogFiles = 5;                                  ///< Maximum number of log files
};

/**
 * @brief Configuration change event
 */
using ConfigChangeCallback = std::function<void(const std::string& key, const std::any& value)>;

// Forward declaration of helper class
class ConfigCreator;

/**
 * @brief Configuration manager for the application
 */
class Config {
public:
    /**
     * @brief Get the global configuration instance
     * @return Reference to the configuration
     */
    static Config& getInstance();

    /**
     * @brief Static method to create a Config instance (for internal use only)
     * @return Unique pointer to Config
     */
    static std::unique_ptr<Config> create();

    /**
     * @brief Destructor
     */
    ~Config();

    /**
     * @brief Initialize the configuration
     * @param configDir Configuration directory
     * @return true if initialization was successful, false otherwise
     */
    bool initialize(const std::filesystem::path& configDir);

    /**
     * @brief Save the configuration
     * @return true if save was successful, false otherwise
     */
    bool save();

    /**
     * @brief Get the application configuration
     * @return Application configuration
     */
    const ApplicationConfig& getApplicationConfig() const;

    /**
     * @brief Set the application configuration
     * @param config Application configuration
     */
    void setApplicationConfig(const ApplicationConfig& config);

    /**
     * @brief Get a backup profile by name
     * @param name Profile name
     * @return Backup profile or nullopt if not found
     */
    std::optional<BackupProfile> getBackupProfile(const std::string& name) const;

    /**
     * @brief Get all backup profiles
     * @return Vector of all backup profiles
     */
    std::vector<BackupProfile> getAllBackupProfiles() const;

    /**
     * @brief Add or update a backup profile
     * @param profile Backup profile
     * @return true if successful, false otherwise
     */
    bool saveBackupProfile(const BackupProfile& profile);

    /**
     * @brief Delete a backup profile
     * @param name Profile name
     * @return true if successful, false otherwise
     */
    bool deleteBackupProfile(const std::string& name);

    /**
     * @brief Get a configuration value
     * @tparam T Value type
     * @param key Configuration key
     * @param defaultValue Default value if key not found
     * @return Configuration value or default value
     */
    template<typename T>
    T getValue(const std::string& key, const T& defaultValue) const;

    /**
     * @brief Set a configuration value
     * @tparam T Value type
     * @param key Configuration key
     * @param value Value to set
     */
    template<typename T>
    void setValue(const std::string& key, const T& value);

    /**
     * @brief Register a callback for configuration changes
     * @param callback Function to call when configuration changes
     * @return Callback ID for unregistering
     */
    int registerChangeCallback(ConfigChangeCallback callback);

    /**
     * @brief Unregister a change callback
     * @param callbackId Callback ID from registerChangeCallback
     */
    void unregisterChangeCallback(int callbackId);

private:
    /**
     * @brief Constructor (private for singleton)
     */
    Config();

    // Prevent copying and assignment
    Config(const Config&) = delete;
    Config& operator=(const Config&) = delete;
    Config(Config&&) = delete;
    Config& operator=(Config&&) = delete;

    class Impl;
    std::unique_ptr<Impl> pImpl;
};

/**
 * @brief Get the global configuration
 * @return Reference to the global configuration
 */
inline Config& getConfig() {
    return Config::getInstance();
}

} // namespace utm 