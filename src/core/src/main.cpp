/**
 * @file main.cpp
 * @brief Main entry point for Ubuntu Time Machine core service
 * @author Ubuntu Time Machine Team
 * @copyright Copyright (c) 2024, GPLv3
 */

#include "utm/backup_engine.hpp"
#include "utm/database.hpp"
#include "utm/config.hpp"
#include "utm/logging.hpp"
#include "utm/filesystem_utils.hpp"
#include "utm/system_utils.hpp"

#include <boost/program_options.hpp>
#include <boost/filesystem.hpp>
#include <iostream>
#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include <csignal>
#include <atomic>

namespace po = boost::program_options;

// Global variables
std::atomic<bool> g_running = true;
std::unique_ptr<utm::BackupEngine> g_backupEngine;

// Signal handler
void signalHandler(int signal) {
    if (signal == SIGINT || signal == SIGTERM) {
        utm::getLogger().info("Received termination signal, shutting down...");
        g_running = false;
    }
}

int main(int argc, char* argv[]) {
    try {
        // Set up command-line options
        po::options_description desc("Ubuntu Time Machine Core Options");
        desc.add_options()
            ("help,h", "Display this help message")
            ("version,v", "Display version information")
            ("config,c", po::value<std::string>(), "Configuration directory")
            ("log-level,l", po::value<std::string>()->default_value("info"), "Log level (trace, debug, info, warning, error, critical)")
            ("daemon,d", "Run as a daemon")
            ("backup", po::value<std::string>(), "Perform a backup with the specified profile")
            ("restore", po::value<std::string>(), "Restore a backup with the specified profile")
            ("list-profiles", "List all available backup profiles")
            ("list-backups", po::value<std::string>(), "List all backups for a profile");

        po::variables_map vm;
        po::store(po::parse_command_line(argc, argv, desc), vm);
        po::notify(vm);

        // Display help if requested
        if (vm.count("help")) {
            std::cout << desc << std::endl;
            return 0;
        }

        // Display version if requested
        if (vm.count("version")) {
            std::cout << "Ubuntu Time Machine Core v2.0.0" << std::endl;
            return 0;
        }

        // Determine configuration directory
        std::filesystem::path configDir;
        if (vm.count("config")) {
            configDir = vm["config"].as<std::string>();
        } else {
            configDir = utm::system::getAppDataDirectory() / "ubuntu-time-machine";
        }

        // Create config directory if it doesn't exist
        if (!std::filesystem::exists(configDir)) {
            std::filesystem::create_directories(configDir);
        }

        // Initialize configuration
        if (!utm::getConfig().initialize(configDir)) {
            std::cerr << "Failed to initialize configuration from " << configDir << std::endl;
            return 1;
        }

        // Initialize logger
        std::filesystem::path logDir = configDir / "logs";
        if (!std::filesystem::exists(logDir)) {
            std::filesystem::create_directories(logDir);
        }

        utm::Logger& logger = utm::getLogger();
        if (!logger.initialize(logDir)) {
            std::cerr << "Failed to initialize logger" << std::endl;
            return 1;
        }

        // Set log level
        std::string logLevel = vm["log-level"].as<std::string>();
        logger.setConsoleLevel(utm::stringToLogLevel(logLevel));
        logger.setFileLevel(utm::LogLevel::DEBUG); // File logging is always more verbose

        utm::getLogger().info("Ubuntu Time Machine Core v2.0.0 starting up");

        // Install signal handlers
        std::signal(SIGINT, signalHandler);
        std::signal(SIGTERM, signalHandler);

        // Create backup engine
        g_backupEngine = std::make_unique<utm::BackupEngine>();
        if (!g_backupEngine->initialize(configDir / "metadata")) {
            utm::getLogger().error("Failed to initialize backup engine");
            return 1;
        }

        // Process commands
        if (vm.count("list-profiles")) {
            const auto profiles = utm::getConfig().getAllBackupProfiles();
            std::cout << "Available backup profiles:" << std::endl;
            for (const auto& profile : profiles) {
                std::cout << "  - " << profile.name << std::endl;
            }
            return 0;
        }

        if (vm.count("list-backups")) {
            const std::string profileName = vm["list-backups"].as<std::string>();
            auto profile = utm::getConfig().getBackupProfile(profileName);
            if (!profile) {
                std::cerr << "Profile not found: " << profileName << std::endl;
                return 1;
            }

            const auto backups = g_backupEngine->listBackups(profile->destinationPath);
            if (backups.empty()) {
                std::cout << "No backups found for profile: " << profileName << std::endl;
                return 0;
            }

            std::cout << "Available backups for profile " << profileName << ":" << std::endl;
            for (const auto& backup : backups) {
                // Format the time as ISO 8601
                std::time_t time = std::chrono::system_clock::to_time_t(backup);
                char timeStr[100];
                std::strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", std::localtime(&time));
                std::cout << "  - " << timeStr << std::endl;
            }
            return 0;
        }

        if (vm.count("backup")) {
            const std::string profileName = vm["backup"].as<std::string>();
            auto profile = utm::getConfig().getBackupProfile(profileName);
            if (!profile) {
                std::cerr << "Profile not found: " << profileName << std::endl;
                return 1;
            }

            utm::BackupConfig config;
            config.sourcePaths = profile->sourcePaths;
            config.destinationPath = profile->destinationPath;
            config.excludePatterns = profile->excludePatterns;
            config.useCompression = profile->useCompression;
            config.compressionLevel = profile->compressionLevel;
            config.useHardLinks = profile->useHardLinks;
            config.verifyBackup = profile->verifyBackup;
            config.threadCount = profile->threadCount;
            
            if (profile->useEncryption && !profile->encryptionMethod.empty()) {
                // In a real implementation, we would prompt for a password or use a secure key store
                // For this example, we'll just use a placeholder
                config.encryptionKey = "encryption-key-placeholder";
            }

            utm::getLogger().info("Starting backup for profile: " + profileName);
            
            g_backupEngine->startBackup(config, [](utm::BackupStatus status, const utm::BackupStats& stats) {
                switch (status) {
                    case utm::BackupStatus::SCANNING:
                        std::cout << "Scanning files..." << std::endl;
                        break;
                    case utm::BackupStatus::BACKING_UP:
                        std::cout << "Backing up files: " << stats.processedFiles << "/" << stats.totalFiles 
                                  << " (" << (stats.processedSize * 100 / (stats.totalSize ? stats.totalSize : 1)) << "%)" << std::endl;
                        break;
                    case utm::BackupStatus::VERIFYING:
                        std::cout << "Verifying backup..." << std::endl;
                        break;
                    case utm::BackupStatus::COMPLETED:
                        std::cout << "Backup completed successfully." << std::endl;
                        std::cout << "Total files: " << stats.totalFiles << std::endl;
                        std::cout << "Total size: " << stats.totalSize << " bytes" << std::endl;
                        std::cout << "New files: " << stats.newFiles << std::endl;
                        std::cout << "Modified files: " << stats.modifiedFiles << std::endl;
                        std::cout << "Unchanged files: " << stats.unchangedFiles << std::endl;
                        std::cout << "Skipped files: " << stats.skippedFiles << std::endl;
                        if (stats.compressionRatio != 1.0) {
                            std::cout << "Compression ratio: " << stats.compressionRatio << std::endl;
                        }
                        if (stats.dedupSavings > 0) {
                            std::cout << "Storage saved by deduplication: " << stats.dedupSavings << " bytes" << std::endl;
                        }
                        g_running = false;
                        break;
                    case utm::BackupStatus::FAILED:
                        std::cerr << "Backup failed." << std::endl;
                        g_running = false;
                        break;
                    case utm::BackupStatus::CANCELLED:
                        std::cout << "Backup cancelled." << std::endl;
                        g_running = false;
                        break;
                    default:
                        break;
                }
            });

            // Wait for backup to complete
            while (g_running && g_backupEngine->getStatus() != utm::BackupStatus::IDLE &&
                   g_backupEngine->getStatus() != utm::BackupStatus::COMPLETED &&
                   g_backupEngine->getStatus() != utm::BackupStatus::FAILED &&
                   g_backupEngine->getStatus() != utm::BackupStatus::CANCELLED) {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
            }

            return g_backupEngine->getStatus() == utm::BackupStatus::COMPLETED ? 0 : 1;
        }

        if (vm.count("restore")) {
            // Similar to backup but for restore operations
            std::cerr << "Restore functionality not implemented in this example" << std::endl;
            return 1;
        }

        // If no specific command was given, run as a service if daemon mode is enabled
        if (vm.count("daemon")) {
            utm::getLogger().info("Running in daemon mode");
            
            // Main service loop
            while (g_running) {
                // Check if there are any scheduled backups to run
                // In a real implementation, this would check the schedule and run backups as needed
                
                // Sleep for a while before checking again
                std::this_thread::sleep_for(std::chrono::seconds(10));
            }
        } else {
            std::cout << "No command specified. Use --help for available options." << std::endl;
            return 1;
        }

        utm::getLogger().info("Ubuntu Time Machine Core shutting down");
        return 0;
    }
    catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
} 