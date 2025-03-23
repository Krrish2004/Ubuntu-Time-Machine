/**
 * @file logging.hpp
 * @brief Logging system for Ubuntu Time Machine
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#pragma once

#include <string>
#include <memory>
#include <filesystem>
#include <chrono>
#include <source_location>

namespace utm {

/**
 * @brief Log levels
 */
enum class LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARNING,
    ERROR,
    CRITICAL,
    OFF
};

/**
 * @brief Convert log level to string
 * @param level Log level
 * @return String representation
 */
std::string logLevelToString(LogLevel level);

/**
 * @brief Convenience function to convert a string to a log level
 */
LogLevel stringToLogLevel(const std::string& level);

// Forward declaration of helper class
class LoggerCreator;

/**
 * @brief Central logging facility
 */
class Logger {
public:
    /**
     * @brief Get the singleton instance
     * @return Reference to the logger instance
     */
    static Logger& getInstance();

    /**
     * @brief Static method to create a Logger instance (for internal use only)
     * @return Unique pointer to Logger
     */
    static std::unique_ptr<Logger> create();

    /**
     * @brief Destructor
     */
    ~Logger();

    /**
     * @brief Initialize the logger
     * @param logDir Directory for log files
     * @param maxSize Maximum size of a log file before rotation (in bytes)
     * @param maxFiles Maximum number of rotated log files to keep
     * @return true if initialization was successful, false otherwise
     */
    bool initialize(
        const std::filesystem::path& logDir,
        std::size_t maxSize = 10 * 1024 * 1024,  // 10 MB
        int maxFiles = 5);

    /**
     * @brief Set the console log level
     * @param level Minimum level to log to console
     */
    void setConsoleLevel(LogLevel level);

    /**
     * @brief Set the file log level
     * @param level Minimum level to log to file
     */
    void setFileLevel(LogLevel level);

    /**
     * @brief Get the console log level
     * @return Current console log level
     */
    LogLevel getConsoleLevel() const;

    /**
     * @brief Get the file log level
     * @return Current file log level
     */
    LogLevel getFileLevel() const;

    /**
     * @brief Log a message
     * @param level Log level
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void log(
        LogLevel level,
        const std::string& message,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log a message with formatting
     * @tparam Args Argument types
     * @param level Log level
     * @param fmt Format string
     * @param args Format arguments
     * @param location Source location (auto-filled)
     */
    template<typename... Args>
    void logf(
        LogLevel level,
        std::string_view fmt,
        Args&&... args,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log a trace message
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void trace(
        const std::string& message,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log a debug message
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void debug(
        const std::string& message,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log an info message
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void info(
        const std::string& message,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log a warning message
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void warning(
        const std::string& message,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log an error message
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void error(
        const std::string& message,
        const std::source_location& location = std::source_location::current());

    /**
     * @brief Log a critical message
     * @param message Message to log
     * @param location Source location (auto-filled)
     */
    void critical(
        const std::string& message,
        const std::source_location& location = std::source_location::current());

private:
    /**
     * @brief Private constructor for singleton pattern
     */
    Logger();

    // Prevent copying and assignment
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    Logger(Logger&&) = delete;
    Logger& operator=(Logger&&) = delete;

    class Impl;
    std::unique_ptr<Impl> pImpl;
};

/**
 * @brief Get the global logger
 * @return Reference to the global logger
 */
inline Logger& getLogger() {
    return Logger::getInstance();
}

} // namespace utm

// Convenience macros
#define UTM_TRACE(message, ...) utm::getLogger().trace(message)
#define UTM_DEBUG(message, ...) utm::getLogger().debug(message)
#define UTM_INFO(message, ...) utm::getLogger().info(message)
#define UTM_WARNING(message, ...) utm::getLogger().warning(message)
#define UTM_ERROR(message, ...) utm::getLogger().error(message)
#define UTM_CRITICAL(message, ...) utm::getLogger().critical(message) 