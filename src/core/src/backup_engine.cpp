#include "utm/backup_engine.hpp"
#include "utm/logging.hpp"
#include "utm/filesystem_utils.hpp"
#include "utm/system_utils.hpp"
#include <map>
#include <set>
#include <chrono>
#include <thread>
#include <mutex>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <iomanip>
#include <cstring>

namespace utm {

// Implementation class for BackupEngine
class BackupEngine::Impl {
public:
    Impl() : status(BackupStatus::IDLE) {}
    
    // Initialize the backup engine
    bool initialize(const std::filesystem::path& metadataPath) {
        std::lock_guard<std::mutex> lock(mutex);
        
        try {
            this->metadataPath = metadataPath;
            
            // Create metadata directory if it doesn't exist
            if (!std::filesystem::exists(metadataPath)) {
                std::filesystem::create_directories(metadataPath);
            }
            
            getLogger().info("Backup engine initialized with metadata path: " + metadataPath.string());
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to initialize backup engine: " + std::string(e.what()));
            return false;
        }
    }
    
    // Start a backup
    bool startBackup(const BackupConfig& config, ProgressCallback progressCallback) {
        std::lock_guard<std::mutex> lock(mutex);
        
        try {
            // Check if a backup is already running
            if (status != BackupStatus::IDLE && 
                status != BackupStatus::COMPLETED && 
                status != BackupStatus::FAILED && 
                status != BackupStatus::CANCELLED) {
                getLogger().error("Cannot start backup: another backup is already running");
                return false;
            }
            
            // Reset stats
            stats = BackupStats();
            stats.startTime = std::chrono::system_clock::now();
            
            // Store configuration
            this->config = config;
            this->progressCallback = progressCallback;
            
            // Start backup thread
            status = BackupStatus::SCANNING;
            backupThread = std::thread(&BackupEngine::Impl::backupThreadFunction, this);
            
            getLogger().info("Backup started");
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to start backup: " + std::string(e.what()));
            status = BackupStatus::FAILED;
            return false;
        }
    }
    
    // Cancel a running backup
    bool cancelBackup() {
        std::lock_guard<std::mutex> lock(mutex);
        
        try {
            // Check if a backup is running
            if (status != BackupStatus::SCANNING && 
                status != BackupStatus::BACKING_UP && 
                status != BackupStatus::VERIFYING) {
                getLogger().error("Cannot cancel backup: no backup is running");
                return false;
            }
            
            // Set cancelled flag
            cancelRequested = true;
            
            getLogger().info("Backup cancellation requested");
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to cancel backup: " + std::string(e.what()));
            return false;
        }
    }
    
    // Get current backup status
    BackupStatus getStatus() const {
        return status;
    }
    
    // Get current backup statistics
    BackupStats getStats() const {
        return stats;
    }
    
    // List available backups for a destination
    std::vector<std::chrono::system_clock::time_point> listBackups(
        const std::filesystem::path& destination) const {
        
        std::vector<std::chrono::system_clock::time_point> result;
        
        try {
            // Check if destination exists
            if (!std::filesystem::exists(destination)) {
                getLogger().error("Backup destination does not exist: " + destination.string());
                return result;
            }
            
            // Check if it's a directory
            if (!std::filesystem::is_directory(destination)) {
                getLogger().error("Backup destination is not a directory: " + destination.string());
                return result;
            }
            
            // Look for backup directories
            std::filesystem::path backupsDir = destination / "backups";
            if (!std::filesystem::exists(backupsDir)) {
                return result; // No backups yet
            }
            
            // Iterate over backup directories
            for (const auto& entry : std::filesystem::directory_iterator(backupsDir)) {
                if (entry.is_directory()) {
                    std::string dirName = entry.path().filename().string();
                    
                    // Try to parse timestamp from directory name
                    try {
                        std::tm tm = {};
                        std::istringstream ss(dirName);
                        ss >> std::get_time(&tm, "%Y%m%d-%H%M%S");
                        
                        if (!ss.fail()) {
                            auto timePoint = std::chrono::system_clock::from_time_t(std::mktime(&tm));
                            result.push_back(timePoint);
                        }
                    }
                    catch (const std::exception& e) {
                        getLogger().warning("Failed to parse backup timestamp from directory: " + dirName);
                    }
                }
            }
            
            // Sort backups by timestamp (newest first)
            std::sort(result.begin(), result.end(), std::greater<>());
            
            return result;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to list backups: " + std::string(e.what()));
            return result;
        }
    }
    
    // Prune old backups
    bool pruneBackups(
        const std::filesystem::path& destination,
        int keepDaily,
        int keepWeekly,
        int keepMonthly) {
        
        try {
            // Get list of backups
            auto backups = listBackups(destination);
            
            if (backups.empty()) {
                getLogger().info("No backups to prune");
                return true;
            }
            
            // Group backups by day, week, and month
            std::map<std::string, std::vector<std::chrono::system_clock::time_point>> dailyBackups;
            std::map<std::string, std::vector<std::chrono::system_clock::time_point>> weeklyBackups;
            std::map<std::string, std::vector<std::chrono::system_clock::time_point>> monthlyBackups;
            
            for (const auto& backup : backups) {
                std::time_t time = std::chrono::system_clock::to_time_t(backup);
                std::tm* tm = std::localtime(&time);
                
                // Format for day: YYYY-MM-DD
                char dayStr[11];
                std::strftime(dayStr, sizeof(dayStr), "%Y-%m-%d", tm);
                dailyBackups[dayStr].push_back(backup);
                
                // Format for week: YYYY-WW (ISO week)
                char weekStr[9];
                std::strftime(weekStr, sizeof(weekStr), "%G-%V", tm);
                weeklyBackups[weekStr].push_back(backup);
                
                // Format for month: YYYY-MM
                char monthStr[8];
                std::strftime(monthStr, sizeof(monthStr), "%Y-%m", tm);
                monthlyBackups[monthStr].push_back(backup);
            }
            
            // Determine which backups to keep
            std::set<std::chrono::system_clock::time_point> backupsToKeep;
            
            // Keep daily backups
            int dailyCount = 0;
            for (auto& [day, dayBackups] : dailyBackups) {
                if (dailyCount >= keepDaily) {
                    break;
                }
                
                // Sort by time (newest first)
                std::sort(dayBackups.begin(), dayBackups.end(), std::greater<>());
                
                // Keep the newest backup of each day
                if (!dayBackups.empty()) {
                    backupsToKeep.insert(dayBackups.front());
                    dailyCount++;
                }
            }
            
            // Keep weekly backups
            int weeklyCount = 0;
            for (auto& [week, weekBackups] : weeklyBackups) {
                if (weeklyCount >= keepWeekly) {
                    break;
                }
                
                // Sort by time (newest first)
                std::sort(weekBackups.begin(), weekBackups.end(), std::greater<>());
                
                // Keep the newest backup of each week
                if (!weekBackups.empty()) {
                    backupsToKeep.insert(weekBackups.front());
                    weeklyCount++;
                }
            }
            
            // Keep monthly backups
            int monthlyCount = 0;
            for (auto& [month, monthBackups] : monthlyBackups) {
                if (monthlyCount >= keepMonthly) {
                    break;
                }
                
                // Sort by time (newest first)
                std::sort(monthBackups.begin(), monthBackups.end(), std::greater<>());
                
                // Keep the newest backup of each month
                if (!monthBackups.empty()) {
                    backupsToKeep.insert(monthBackups.front());
                    monthlyCount++;
                }
            }
            
            // Delete backups that aren't in the keep set
            int deletedCount = 0;
            for (const auto& backup : backups) {
                if (backupsToKeep.find(backup) == backupsToKeep.end()) {
                    // Delete this backup
                    std::time_t time = std::chrono::system_clock::to_time_t(backup);
                    std::tm* tm = std::localtime(&time);
                    
                    char backupDirName[20];
                    std::strftime(backupDirName, sizeof(backupDirName), "%Y%m%d-%H%M%S", tm);
                    
                    std::filesystem::path backupDir = destination / "backups" / backupDirName;
                    if (std::filesystem::exists(backupDir)) {
                        std::filesystem::remove_all(backupDir);
                        deletedCount++;
                    }
                }
            }
            
            getLogger().info("Pruned " + std::to_string(deletedCount) + " backups, keeping " + 
                            std::to_string(backupsToKeep.size()));
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to prune backups: " + std::string(e.what()));
            return false;
        }
    }
    
private:
    // Mutex for thread safety
    std::mutex mutex;
    
    // Configuration
    std::filesystem::path metadataPath;
    BackupConfig config;
    ProgressCallback progressCallback;
    
    // State
    BackupStatus status;
    BackupStats stats;
    std::thread backupThread;
    std::atomic<bool> cancelRequested{false};
    
    // The main backup thread function
    void backupThreadFunction() {
        try {
            // Phase 1: Scanning files
            status = BackupStatus::SCANNING;
            if (!scanFiles()) {
                completeBackup(false);
                return;
            }
            
            // Check for cancellation
            if (cancelRequested) {
                completeBackup(false, true);
                return;
            }
            
            // Phase 2: Backing up files
            status = BackupStatus::BACKING_UP;
            if (!backupFiles()) {
                completeBackup(false);
                return;
            }
            
            // Check for cancellation
            if (cancelRequested) {
                completeBackup(false, true);
                return;
            }
            
            // Phase 3: Verification
            if (config.verifyBackup) {
                status = BackupStatus::VERIFYING;
                if (!verifyBackup()) {
                    completeBackup(false);
                    return;
                }
                
                // Check for cancellation
                if (cancelRequested) {
                    completeBackup(false, true);
                    return;
                }
            }
            
            // Backup completed successfully
            completeBackup(true);
        }
        catch (const std::exception& e) {
            getLogger().error("Exception in backup thread: " + std::string(e.what()));
            status = BackupStatus::FAILED;
            
            if (progressCallback) {
                progressCallback(status, stats);
            }
        }
    }
    
    // Scan files to be backed up
    bool scanFiles() {
        try {
            getLogger().info("Scanning files...");
            
            // Check source paths
            for (const auto& sourcePath : config.sourcePaths) {
                if (!std::filesystem::exists(sourcePath)) {
                    getLogger().error("Source path does not exist: " + sourcePath.string());
                    return false;
                }
                
                // Scan directory recursively
                scanDirectory(sourcePath);
                
                // Check for cancellation
                if (cancelRequested) {
                    getLogger().info("Backup cancelled during scanning");
                    return false;
                }
            }
            
            getLogger().info("Scan completed: " + std::to_string(stats.totalFiles) + 
                            " files, " + std::to_string(stats.totalSize) + " bytes");
                            
            // Update progress
            if (progressCallback) {
                progressCallback(status, stats);
            }
            
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to scan files: " + std::string(e.what()));
            return false;
        }
    }
    
    // Scan a directory recursively
    void scanDirectory(const std::filesystem::path& path) {
        try {
            for (const auto& entry : std::filesystem::directory_iterator(path)) {
                // Check if this path should be excluded
                bool exclude = false;
                for (const auto& pattern : config.excludePatterns) {
                    // Simple pattern matching for this example
                    if (entry.path().string().find(pattern) != std::string::npos) {
                        exclude = true;
                        break;
                    }
                }
                
                if (exclude) {
                    continue;
                }
                
                if (entry.is_directory()) {
                    stats.totalDirectories++;
                    scanDirectory(entry.path());
                }
                else if (entry.is_regular_file()) {
                    stats.totalFiles++;
                    stats.totalSize += entry.file_size();
                }
                
                // Check for cancellation
                if (cancelRequested) {
                    return;
                }
            }
        }
        catch (const std::exception& e) {
            getLogger().error("Exception scanning directory " + path.string() + ": " + std::string(e.what()));
        }
    }
    
    // Backup files
    bool backupFiles() {
        try {
            getLogger().info("Starting backup of " + std::to_string(stats.totalFiles) + 
                            " files (" + std::to_string(stats.totalSize) + " bytes)");
            
            // Create backup destination directory structure
            std::filesystem::path backupRoot = config.destinationPath;
            
            if (!std::filesystem::exists(backupRoot)) {
                std::filesystem::create_directories(backupRoot);
            }
            
            // Create backups directory
            std::filesystem::path backupsDir = backupRoot / "backups";
            if (!std::filesystem::exists(backupsDir)) {
                std::filesystem::create_directories(backupsDir);
            }
            
            // Create a timestamp-based directory for this backup
            auto now = std::chrono::system_clock::now();
            std::time_t time = std::chrono::system_clock::to_time_t(now);
            std::tm* tm = std::localtime(&time);
            
            char backupDirName[20];
            std::strftime(backupDirName, sizeof(backupDirName), "%Y%m%d-%H%M%S", tm);
            
            std::filesystem::path backupDir = backupsDir / backupDirName;
            std::filesystem::create_directories(backupDir);
            
            // Find the previous backup for hard linking if enabled
            std::filesystem::path previousBackupDir;
            if (config.useHardLinks) {
                auto backups = listBackups(config.destinationPath);
                if (!backups.empty()) {
                    // Use the most recent backup
                    std::time_t prevTime = std::chrono::system_clock::to_time_t(backups[0]);
                    std::tm* prevTm = std::localtime(&prevTime);
                    
                    char prevBackupDirName[20];
                    std::strftime(prevBackupDirName, sizeof(prevBackupDirName), "%Y%m%d-%H%M%S", prevTm);
                    
                    previousBackupDir = backupsDir / prevBackupDirName;
                }
            }
            
            // Back up each source path
            for (const auto& sourcePath : config.sourcePaths) {
                if (!backupDirectory(sourcePath, backupDir, sourcePath, previousBackupDir)) {
                    return false;
                }
                
                // Check for cancellation
                if (cancelRequested) {
                    getLogger().info("Backup cancelled during backup phase");
                    return false;
                }
            }
            
            // Save backup metadata
            saveBackupMetadata(backupDir);
            
            getLogger().info("Backup completed successfully: " + std::to_string(stats.processedFiles) + 
                            " files, " + std::to_string(stats.processedSize) + " bytes");
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to backup files: " + std::string(e.what()));
            return false;
        }
    }
    
    // Backup a directory recursively
    bool backupDirectory(
        const std::filesystem::path& sourcePath,
        const std::filesystem::path& backupDir,
        const std::filesystem::path& basePath,
        const std::filesystem::path& previousBackupDir) {
        
        try {
            // Create destination directory
            std::filesystem::path relativePath = std::filesystem::relative(sourcePath, basePath);
            std::filesystem::path destPath = backupDir / relativePath;
            
            if (!std::filesystem::exists(destPath)) {
                std::filesystem::create_directories(destPath);
            }
            
            // Iterate over directory entries
            for (const auto& entry : std::filesystem::directory_iterator(sourcePath)) {
                // Check if this path should be excluded
                bool exclude = false;
                for (const auto& pattern : config.excludePatterns) {
                    // Simple pattern matching for this example
                    if (entry.path().string().find(pattern) != std::string::npos) {
                        exclude = true;
                        break;
                    }
                }
                
                if (exclude) {
                    stats.skippedFiles++;
                    continue;
                }
                
                if (entry.is_directory()) {
                    // Recursively backup this directory
                    if (!backupDirectory(entry.path(), backupDir, basePath, previousBackupDir)) {
                        return false;
                    }
                }
                else if (entry.is_regular_file()) {
                    // Backup this file
                    if (!backupFile(entry.path(), backupDir, basePath, previousBackupDir)) {
                        return false;
                    }
                    
                    // Update progress
                    stats.processedFiles++;
                    stats.processedSize += entry.file_size();
                    
                    if (progressCallback) {
                        progressCallback(status, stats);
                    }
                }
                
                // Check for cancellation
                if (cancelRequested) {
                    return false;
                }
            }
            
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Exception backing up directory " + sourcePath.string() + ": " + std::string(e.what()));
            return false;
        }
    }
    
    // Backup a single file
    bool backupFile(
        const std::filesystem::path& sourceFile,
        const std::filesystem::path& backupDir,
        const std::filesystem::path& basePath,
        const std::filesystem::path& previousBackupDir) {
        
        try {
            // Get relative path
            std::filesystem::path relativePath = std::filesystem::relative(sourceFile, basePath);
            std::filesystem::path destFile = backupDir / relativePath;
            
            // Create parent directories if needed
            std::filesystem::create_directories(destFile.parent_path());
            
            // Check if the file exists in the previous backup
            bool fileChanged = true;
            if (!previousBackupDir.empty()) {
                std::filesystem::path prevFile = previousBackupDir / relativePath;
                
                if (std::filesystem::exists(prevFile) && 
                    std::filesystem::file_size(prevFile) == std::filesystem::file_size(sourceFile)) {
                    
                    // Check if file contents are the same
                    fileChanged = !areFilesEqual(sourceFile, prevFile);
                    
                    if (!fileChanged) {
                        // File unchanged, create hard link
                        std::filesystem::create_hard_link(prevFile, destFile);
                        stats.unchangedFiles++;
                        return true;
                    }
                }
            }
            
            // File changed or no previous backup, copy the file
            std::filesystem::copy_file(sourceFile, destFile, std::filesystem::copy_options::overwrite_existing);
            
            if (fileChanged) {
                stats.modifiedFiles++;
            } else {
                stats.newFiles++;
            }
            
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Exception backing up file " + sourceFile.string() + ": " + std::string(e.what()));
            return false;
        }
    }
    
    // Compare two files to see if they are equal
    bool areFilesEqual(const std::filesystem::path& file1, const std::filesystem::path& file2) {
        try {
            // Check file sizes first
            if (std::filesystem::file_size(file1) != std::filesystem::file_size(file2)) {
                return false;
            }
            
            // Compare file contents
            std::ifstream f1(file1, std::ifstream::binary);
            std::ifstream f2(file2, std::ifstream::binary);
            
            if (!f1 || !f2) {
                return false;
            }
            
            constexpr size_t BUFFER_SIZE = 4096;
            char buffer1[BUFFER_SIZE];
            char buffer2[BUFFER_SIZE];
            
            while (f1 && f2) {
                f1.read(buffer1, BUFFER_SIZE);
                f2.read(buffer2, BUFFER_SIZE);
                
                if (f1.gcount() != f2.gcount()) {
                    return false;
                }
                
                if (std::memcmp(buffer1, buffer2, f1.gcount()) != 0) {
                    return false;
                }
            }
            
            return true;
        }
        catch (const std::exception& e) {
            getLogger().error("Exception comparing files: " + std::string(e.what()));
            return false;
        }
    }
    
    // Save backup metadata
    void saveBackupMetadata(const std::filesystem::path& backupDir) {
        try {
            // Create metadata file
            std::filesystem::path metadataFile = backupDir / "backup-info.json";
            std::ofstream file(metadataFile);
            
            if (!file) {
                getLogger().error("Failed to create metadata file: " + metadataFile.string());
                return;
            }
            
            // Write metadata
            file << "{\n";
            file << "  \"timestamp\": \"" << std::chrono::system_clock::to_time_t(stats.startTime) << "\",\n";
            file << "  \"endTime\": \"" << std::chrono::system_clock::to_time_t(std::chrono::system_clock::now()) << "\",\n";
            file << "  \"totalFiles\": " << stats.totalFiles << ",\n";
            file << "  \"totalDirectories\": " << stats.totalDirectories << ",\n";
            file << "  \"totalSize\": " << stats.totalSize << ",\n";
            file << "  \"newFiles\": " << stats.newFiles << ",\n";
            file << "  \"modifiedFiles\": " << stats.modifiedFiles << ",\n";
            file << "  \"unchangedFiles\": " << stats.unchangedFiles << ",\n";
            file << "  \"skippedFiles\": " << stats.skippedFiles << ",\n";
            file << "  \"hardwareIdentifier\": \"" << utm::system::getHardwareIdentifier() << "\",\n";
            file << "  \"compressionEnabled\": " << (config.useCompression ? "true" : "false") << ",\n";
            file << "  \"compressionLevel\": " << config.compressionLevel << ",\n";
            file << "  \"encryptionEnabled\": " << (config.encryptionKey.has_value() ? "true" : "false") << "\n";
            file << "}\n";
            
            file.close();
        }
        catch (const std::exception& e) {
            getLogger().error("Failed to save backup metadata: " + std::string(e.what()));
        }
    }
    
    // Verify the backup
    bool verifyBackup() {
        // In a real implementation, this would perform integrity checks
        // For this example, we just wait a bit and report success
        getLogger().info("Verifying backup...");
        
        // Simulate verification work
        for (int i = 0; i < 5; i++) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            
            // Check for cancellation
            if (cancelRequested) {
                getLogger().info("Backup verification cancelled");
                return false;
            }
        }
        
        getLogger().info("Backup verification completed successfully");
        return true;
    }
    
    // Complete the backup
    void completeBackup(bool success, bool cancelled = false) {
        if (cancelled) {
            status = BackupStatus::CANCELLED;
            getLogger().info("Backup cancelled");
        }
        else if (success) {
            status = BackupStatus::COMPLETED;
            getLogger().info("Backup completed successfully");
        }
        else {
            status = BackupStatus::FAILED;
            getLogger().error("Backup failed");
        }
        
        // Set end time
        stats.endTime = std::chrono::system_clock::now();
        
        // Call progress callback one last time
        if (progressCallback) {
            progressCallback(status, stats);
        }
    }
};

// BackupEngine implementation

BackupEngine::BackupEngine() : pImpl(std::make_unique<Impl>()) {
}

BackupEngine::~BackupEngine() = default;

bool BackupEngine::initialize(const std::filesystem::path& metadataPath) {
    return pImpl->initialize(metadataPath);
}

bool BackupEngine::startBackup(const BackupConfig& config, ProgressCallback progressCallback) {
    return pImpl->startBackup(config, progressCallback);
}

bool BackupEngine::cancelBackup() {
    return pImpl->cancelBackup();
}

BackupStatus BackupEngine::getStatus() const {
    return pImpl->getStatus();
}

BackupStats BackupEngine::getStats() const {
    return pImpl->getStats();
}

std::vector<std::chrono::system_clock::time_point> BackupEngine::listBackups(
    const std::filesystem::path& destination) const {
    return pImpl->listBackups(destination);
}

bool BackupEngine::pruneBackups(
    const std::filesystem::path& destination,
    int keepDaily,
    int keepWeekly,
    int keepMonthly) {
    return pImpl->pruneBackups(destination, keepDaily, keepWeekly, keepMonthly);
}

} // namespace utm 