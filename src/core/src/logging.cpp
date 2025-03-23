#include "utm/logging.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <mutex>
#include <chrono>
#include <ctime>
#include <regex>
#include <string_view>
#include <format>
#include <filesystem>

namespace utm {

// Implementation class for Logger
class Logger::Impl {
public:
    Impl() : consoleLevel(LogLevel::INFO), fileLevel(LogLevel::DEBUG), initialized(false) {}
    
    ~Impl() {
        if (logFile.is_open()) {
            logFile.close();
        }
    }
    
    bool initialize(const std::filesystem::path& logDir, std::size_t maxLogSize, int maxLogFiles) {
        std::lock_guard<std::mutex> lock(logMutex);
        
        try {
            // Create log directory if it doesn't exist
            if (!std::filesystem::exists(logDir)) {
                if (!std::filesystem::create_directories(logDir)) {
                    std::cerr << "Failed to create log directory: " << logDir.string() << std::endl;
                    return false;
                }
            }
            
            // Open log file
            this->logDir = logDir;
            std::filesystem::path logFilePath = logDir / "utm.log";
            
            logFile.open(logFilePath, std::ios::out | std::ios::app);
            if (!logFile) {
                std::cerr << "Failed to open log file: " << logFilePath.string() << std::endl;
                return false;
            }
            
            // Store settings
            this->maxLogSize = maxLogSize;
            this->maxLogFiles = maxLogFiles;
            
            // Log initialization
            auto now = std::chrono::system_clock::now();
            std::time_t timeT = std::chrono::system_clock::to_time_t(now);
            std::string timeStr = std::ctime(&timeT);
            timeStr.resize(timeStr.size() - 1); // Remove trailing newline
            
            logFile << "===== Ubuntu Time Machine Log Started at " << timeStr << " =====" << std::endl;
            
            initialized = true;
            return true;
        }
        catch (const std::exception& e) {
            std::cerr << "Failed to initialize logger: " << e.what() << std::endl;
            return false;
        }
    }
    
    void setConsoleLevel(LogLevel level) {
        std::lock_guard<std::mutex> lock(logMutex);
        consoleLevel = level;
    }
    
    void setFileLevel(LogLevel level) {
        std::lock_guard<std::mutex> lock(logMutex);
        fileLevel = level;
    }
    
    LogLevel getConsoleLevel() const {
        return consoleLevel;
    }
    
    LogLevel getFileLevel() const {
        return fileLevel;
    }
    
    bool shouldLog(LogLevel level, LogLevel threshold) const {
        return level >= threshold && threshold != LogLevel::OFF;
    }
    
    std::string formatMessage(LogLevel level, const std::string& message, const std::source_location& location) const {
        // Format timestamp
        auto now = std::chrono::system_clock::now();
        std::time_t timeT = std::chrono::system_clock::to_time_t(now);
        std::tm* tm = std::localtime(&timeT);
        
        std::stringstream ss;
        ss << std::put_time(tm, "%Y-%m-%d %H:%M:%S");
        
        // Add milliseconds
        auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
        ss << '.' << std::setfill('0') << std::setw(3) << ms.count();
        
        // Format the message
        ss << " [" << logLevelToString(level) << "] ";
        
        // Add file and line information for levels >= WARNING
        if (level >= LogLevel::WARNING) {
            std::filesystem::path filePath(location.file_name());
            ss << "[" << filePath.filename().string() << ":" << location.line() << "] ";
        }
        
        ss << message;
        
        return ss.str();
    }
    
    void log(LogLevel level, const std::string& message, const std::source_location& location) {
        std::lock_guard<std::mutex> lock(logMutex);
        
        std::string formattedMessage = formatMessage(level, message, location);
        
        // Log to console if level is high enough
        if (shouldLog(level, consoleLevel)) {
            if (level >= LogLevel::ERROR) {
                std::cerr << formattedMessage << std::endl;
            } else {
                std::cout << formattedMessage << std::endl;
            }
        }
        
        // Log to file if initialized and level is high enough
        if (initialized && shouldLog(level, fileLevel) && logFile.is_open()) {
            logFile << formattedMessage << std::endl;
            logFile.flush();
            
            // TODO: Implement log rotation
        }
    }
    
private:
    // Log levels
    LogLevel consoleLevel;
    LogLevel fileLevel;
    
    // File handling
    bool initialized;
    std::filesystem::path logDir;
    std::ofstream logFile;
    std::size_t maxLogSize;
    int maxLogFiles;
    
    // Thread safety
    std::mutex logMutex;
};

// Static singleton instance
namespace {
    std::unique_ptr<Logger> loggerInstance;
    std::once_flag initFlag;
    
    void createLoggerInstance() {
        loggerInstance = Logger::create();
    }
}

// Logger implementation
Logger::Logger() : pImpl(std::make_unique<Impl>()) {
}

Logger::~Logger() = default;

std::unique_ptr<Logger> Logger::create() {
    return std::unique_ptr<Logger>(new Logger());
}

Logger& Logger::getInstance() {
    std::call_once(initFlag, createLoggerInstance);
    return *loggerInstance;
}

bool Logger::initialize(const std::filesystem::path& logDir, std::size_t maxSize, int maxFiles) {
    return pImpl->initialize(logDir, maxSize, maxFiles);
}

void Logger::setConsoleLevel(LogLevel level) {
    pImpl->setConsoleLevel(level);
}

void Logger::setFileLevel(LogLevel level) {
    pImpl->setFileLevel(level);
}

LogLevel Logger::getConsoleLevel() const {
    return pImpl->getConsoleLevel();
}

LogLevel Logger::getFileLevel() const {
    return pImpl->getFileLevel();
}

void Logger::log(LogLevel level, const std::string& message, const std::source_location& location) {
    pImpl->log(level, message, location);
}

void Logger::trace(const std::string& message, const std::source_location& location) {
    log(LogLevel::TRACE, message, location);
}

void Logger::debug(const std::string& message, const std::source_location& location) {
    log(LogLevel::DEBUG, message, location);
}

void Logger::info(const std::string& message, const std::source_location& location) {
    log(LogLevel::INFO, message, location);
}

void Logger::warning(const std::string& message, const std::source_location& location) {
    log(LogLevel::WARNING, message, location);
}

void Logger::error(const std::string& message, const std::source_location& location) {
    log(LogLevel::ERROR, message, location);
}

void Logger::critical(const std::string& message, const std::source_location& location) {
    log(LogLevel::CRITICAL, message, location);
}

// Utility functions
std::string logLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::TRACE:    return "TRACE";
        case LogLevel::DEBUG:    return "DEBUG";
        case LogLevel::INFO:     return "INFO";
        case LogLevel::WARNING:  return "WARNING";
        case LogLevel::ERROR:    return "ERROR";
        case LogLevel::CRITICAL: return "CRITICAL";
        case LogLevel::OFF:      return "OFF";
        default:                 return "UNKNOWN";
    }
}

LogLevel stringToLogLevel(const std::string& levelStr) {
    std::string upperStr = levelStr;
    std::transform(upperStr.begin(), upperStr.end(), upperStr.begin(), ::toupper);
    
    if (upperStr == "TRACE")     return LogLevel::TRACE;
    if (upperStr == "DEBUG")     return LogLevel::DEBUG;
    if (upperStr == "INFO")      return LogLevel::INFO;
    if (upperStr == "WARNING")   return LogLevel::WARNING;
    if (upperStr == "ERROR")     return LogLevel::ERROR;
    if (upperStr == "CRITICAL")  return LogLevel::CRITICAL;
    if (upperStr == "OFF")       return LogLevel::OFF;
    
    return LogLevel::INFO; // Default
}

} // namespace utm 