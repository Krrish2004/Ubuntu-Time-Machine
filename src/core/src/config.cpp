#include <utm/config.hpp>
#include <utm/system_utils.hpp>
#include <utm/logging.hpp>

#include <fstream>
#include <sstream>
#include <vector>
#include <algorithm>
#include <mutex>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/json_parser.hpp>
#include <boost/uuid/uuid.hpp>
#include <boost/uuid/uuid_generators.hpp>
#include <boost/uuid/uuid_io.hpp>

namespace utm {

// Define the implementation class
class Config::Impl {
public:
    Impl() : initialized(false) {}

    ~Impl() {
        if (initialized) {
            // Save any unsaved changes when shutting down
            try {
                saveConfig();
            } catch (const std::exception& e) {
                // Just log and continue, don't throw from destructor
                UTM_ERROR("Failed to save config during shutdown: {}", e.what());
            }
        }
    }

    bool initialize(const std::filesystem::path& configDir) {
        std::lock_guard<std::mutex> lock(configMutex);
        
        if (initialized) {
            return true;
        }

        try {
            this->configDir = configDir;
            this->configFile = configDir / "config.json";
            this->profilesDir = configDir / "profiles";

            // Create directories if they don't exist
            std::filesystem::create_directories(configDir);
            std::filesystem::create_directories(profilesDir);

            UTM_INFO("Initializing configuration in {}", configDir.string());

            // Load existing config or create default
            if (std::filesystem::exists(configFile)) {
                UTM_INFO("Loading existing configuration from {}", configFile.string());
                if (!loadConfig()) {
                    UTM_ERROR("Failed to load existing configuration, creating default");
                    if (!createDefaultConfig()) {
                        UTM_ERROR("Failed to create default configuration");
                        return false;
                    }
                }
            } else {
                UTM_INFO("No existing configuration found, creating default");
                if (!createDefaultConfig()) {
                    UTM_ERROR("Failed to create default configuration");
                    return false;
                }
            }

            // Load profiles
            loadProfiles();

            initialized = true;
            UTM_INFO("Configuration initialized successfully");
            return true;
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to initialize configuration: {}", e.what());
            return false;
        }
    }

    bool createDefaultConfig() {
        try {
            // Create default application config
            appConfig = {};
            appConfig.logDirectory = configDir / "logs";
            appConfig.logLevel = LogLevel::INFO;
            appConfig.defaultLanguage = "en";
            appConfig.checkUpdates = true;
            appConfig.darkTheme = false;
            appConfig.minimizeToTray = true;
            appConfig.showNotifications = true;
            appConfig.startMinimized = false;
            appConfig.autoStart = false;
            appConfig.limitCpuUsage = true;
            appConfig.maxCpuPercentage = 50;
            appConfig.pauseOnBattery = true;
            appConfig.pauseOnMeteredConnection = true;
            appConfig.maxLogSize = 10 * 1024 * 1024;
            appConfig.maxLogFiles = 5;

            // Save the default config
            return saveConfig();
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to create default configuration: {}", e.what());
            return false;
        }
    }

    bool loadConfig() {
        try {
            boost::property_tree::ptree root;
            boost::property_tree::read_json(configFile.string(), root);

            // Load application config
            if (auto appNode = root.get_child_optional("application")) {
                appConfig.logDirectory = appNode->get<std::string>("logDirectory", (configDir / "logs").string());
                appConfig.logLevel = stringToLogLevel(appNode->get<std::string>("logLevel", "INFO"));
                appConfig.defaultLanguage = appNode->get<std::string>("defaultLanguage", "en");
                appConfig.checkUpdates = appNode->get<bool>("checkUpdates", true);
                appConfig.darkTheme = appNode->get<bool>("darkTheme", false);
                appConfig.minimizeToTray = appNode->get<bool>("minimizeToTray", true);
                appConfig.showNotifications = appNode->get<bool>("showNotifications", true);
                appConfig.startMinimized = appNode->get<bool>("startMinimized", false);
                appConfig.autoStart = appNode->get<bool>("autoStart", false);
                appConfig.limitCpuUsage = appNode->get<bool>("limitCpuUsage", true);
                appConfig.maxCpuPercentage = appNode->get<int>("maxCpuPercentage", 50);
                appConfig.pauseOnBattery = appNode->get<bool>("pauseOnBattery", true);
                appConfig.pauseOnMeteredConnection = appNode->get<bool>("pauseOnMeteredConnection", true);
                appConfig.maxLogSize = appNode->get<size_t>("maxLogSize", 10 * 1024 * 1024);
                appConfig.maxLogFiles = appNode->get<int>("maxLogFiles", 5);
            } else {
                UTM_WARNING("No application configuration found, using defaults");
                appConfig = {};
                appConfig.logDirectory = configDir / "logs";
                appConfig.logLevel = LogLevel::INFO;
                appConfig.defaultLanguage = "en";
            }

            UTM_INFO("Configuration loaded successfully");
            return true;
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to load configuration: {}", e.what());
            return false;
        }
    }

    bool saveConfig() {
        try {
            boost::property_tree::ptree root;
            boost::property_tree::ptree appNode;

            // Application config
            appNode.put("logDirectory", appConfig.logDirectory.string());
            appNode.put("logLevel", logLevelToString(appConfig.logLevel));
            appNode.put("defaultLanguage", appConfig.defaultLanguage);
            appNode.put("checkUpdates", appConfig.checkUpdates);
            appNode.put("darkTheme", appConfig.darkTheme);
            appNode.put("minimizeToTray", appConfig.minimizeToTray);
            appNode.put("showNotifications", appConfig.showNotifications);
            appNode.put("startMinimized", appConfig.startMinimized);
            appNode.put("autoStart", appConfig.autoStart);
            appNode.put("limitCpuUsage", appConfig.limitCpuUsage);
            appNode.put("maxCpuPercentage", appConfig.maxCpuPercentage);
            appNode.put("pauseOnBattery", appConfig.pauseOnBattery);
            appNode.put("pauseOnMeteredConnection", appConfig.pauseOnMeteredConnection);
            appNode.put("maxLogSize", appConfig.maxLogSize);
            appNode.put("maxLogFiles", appConfig.maxLogFiles);

            root.put_child("application", appNode);

            // Create the config directory if it doesn't exist
            std::filesystem::create_directories(configDir);

            // Write the configuration to file
            boost::property_tree::write_json(configFile.string(), root);
            
            UTM_INFO("Configuration saved successfully to {}", configFile.string());
            return true;
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to save configuration: {}", e.what());
            return false;
        }
    }

    void loadProfiles() {
        try {
            profiles.clear();
            
            if (!std::filesystem::exists(profilesDir)) {
                std::filesystem::create_directories(profilesDir);
                UTM_INFO("Created profiles directory at {}", profilesDir.string());
                return;
            }

            // Iterate through profile directory and load all profiles
            for (const auto& entry : std::filesystem::directory_iterator(profilesDir)) {
                if (entry.is_regular_file() && entry.path().extension() == ".json") {
                    std::string profileId = entry.path().stem().string();
                    
                    auto profile = loadProfile(profileId);
                    if (profile) {
                        profiles.push_back(*profile);
                        UTM_INFO("Loaded profile: {}", profileId);
                    } else {
                        UTM_ERROR("Failed to load profile: {}", profileId);
                    }
                }
            }

            UTM_INFO("Loaded {} backup profiles", profiles.size());
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to load profiles: {}", e.what());
        }
    }

    std::optional<BackupProfile> loadProfile(const std::string& profileId) {
        try {
            std::filesystem::path profilePath = profilesDir / (profileId + ".json");
            
            if (!std::filesystem::exists(profilePath)) {
                UTM_ERROR("Profile does not exist: {}", profileId);
                return std::nullopt;
            }
            
            boost::property_tree::ptree root;
            boost::property_tree::read_json(profilePath.string(), root);
            
            BackupProfile profile;
            profile.name = root.get<std::string>("name", "");
            
            // Source paths
            if (auto pathsNode = root.get_child_optional("sourcePaths")) {
                for (const auto& pathNode : *pathsNode) {
                    profile.sourcePaths.push_back(pathNode.second.get_value<std::string>());
                }
            }
            
            profile.destinationPath = root.get<std::string>("destinationPath", "");
            
            // Exclude patterns
            if (auto patternsNode = root.get_child_optional("excludePatterns")) {
                for (const auto& patternNode : *patternsNode) {
                    profile.excludePatterns.push_back(patternNode.second.get_value<std::string>());
                }
            }
            
            profile.useCompression = root.get<bool>("useCompression", false);
            profile.compressionLevel = root.get<int>("compressionLevel", 6);
            profile.useEncryption = root.get<bool>("useEncryption", false);
            profile.encryptionMethod = root.get<std::string>("encryptionMethod", "");
            profile.verifyBackup = root.get<bool>("verifyBackup", true);
            profile.useHardLinks = root.get<bool>("useHardLinks", true);
            profile.threadCount = root.get<int>("threadCount", 0);
            
            // Schedule
            if (auto scheduleNode = root.get_child_optional("schedule")) {
                std::string typeStr = scheduleNode->get<std::string>("type", "DAILY");
                if (typeStr == "HOURLY") profile.schedule.type = ScheduleType::HOURLY;
                else if (typeStr == "DAILY") profile.schedule.type = ScheduleType::DAILY;
                else if (typeStr == "WEEKLY") profile.schedule.type = ScheduleType::WEEKLY;
                else if (typeStr == "MONTHLY") profile.schedule.type = ScheduleType::MONTHLY;
                else if (typeStr == "CUSTOM") profile.schedule.type = ScheduleType::CUSTOM;
                
                // Schedule interval in hours
                profile.schedule.interval = std::chrono::hours(scheduleNode->get<int>("intervalHours", 24));
                profile.schedule.dayOfWeek = scheduleNode->get<int>("dayOfWeek", 1);
                profile.schedule.dayOfMonth = scheduleNode->get<int>("dayOfMonth", 1);
                profile.schedule.enabled = scheduleNode->get<bool>("enabled", true);
                
                // Start time is stored as a string in ISO format
                std::string startTimeStr = scheduleNode->get<std::string>("startTime", "");
                if (!startTimeStr.empty()) {
                    // Convert startTimeStr to time_point - this is simplified
                    // A real implementation would parse the ISO string properly
                    profile.schedule.startTime = std::chrono::system_clock::now();
                }
            }
            
            // Retention policy
            if (auto retentionNode = root.get_child_optional("retention")) {
                profile.retention.keepDaily = retentionNode->get<int>("keepDaily", 7);
                profile.retention.keepWeekly = retentionNode->get<int>("keepWeekly", 4);
                profile.retention.keepMonthly = retentionNode->get<int>("keepMonthly", 12);
                profile.retention.keepYearly = retentionNode->get<int>("keepYearly", 5);
                profile.retention.autoDelete = retentionNode->get<bool>("autoDelete", true);
            }
            
            return profile;
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to load profile {}: {}", profileId, e.what());
            return std::nullopt;
        }
    }

    bool saveProfile(const BackupProfile& profile) {
        try {
            std::string profileId = profile.name;
            
            // Replace spaces and special characters
            std::replace(profileId.begin(), profileId.end(), ' ', '_');
            profileId.erase(std::remove_if(profileId.begin(), profileId.end(), 
                [](char c) { return !std::isalnum(c) && c != '_' && c != '-'; }), profileId.end());
                
            std::filesystem::path profilePath = profilesDir / (profileId + ".json");
            
            boost::property_tree::ptree root;
            root.put("name", profile.name);
            
            // Source paths
            boost::property_tree::ptree pathsNode;
            for (const auto& path : profile.sourcePaths) {
                boost::property_tree::ptree pathNode;
                pathNode.put("", path.string());
                pathsNode.push_back(std::make_pair("", pathNode));
            }
            root.put_child("sourcePaths", pathsNode);
            
            root.put("destinationPath", profile.destinationPath.string());
            
            // Exclude patterns
            boost::property_tree::ptree patternsNode;
            for (const auto& pattern : profile.excludePatterns) {
                boost::property_tree::ptree patternNode;
                patternNode.put("", pattern);
                patternsNode.push_back(std::make_pair("", patternNode));
            }
            root.put_child("excludePatterns", patternsNode);
            
            root.put("useCompression", profile.useCompression);
            root.put("compressionLevel", profile.compressionLevel);
            root.put("useEncryption", profile.useEncryption);
            root.put("encryptionMethod", profile.encryptionMethod);
            root.put("verifyBackup", profile.verifyBackup);
            root.put("useHardLinks", profile.useHardLinks);
            root.put("threadCount", profile.threadCount);
            
            // Schedule
            boost::property_tree::ptree scheduleNode;
            
            std::string typeStr;
            switch (profile.schedule.type) {
                case ScheduleType::HOURLY: typeStr = "HOURLY"; break;
                case ScheduleType::DAILY: typeStr = "DAILY"; break;
                case ScheduleType::WEEKLY: typeStr = "WEEKLY"; break;
                case ScheduleType::MONTHLY: typeStr = "MONTHLY"; break;
                case ScheduleType::CUSTOM: typeStr = "CUSTOM"; break;
                default: typeStr = "DAILY";
            }
            scheduleNode.put("type", typeStr);
            
            // Store interval in hours
            scheduleNode.put("intervalHours", profile.schedule.interval.count());
            scheduleNode.put("dayOfWeek", profile.schedule.dayOfWeek);
            scheduleNode.put("dayOfMonth", profile.schedule.dayOfMonth);
            scheduleNode.put("enabled", profile.schedule.enabled);
            
            // This is simplified - a real implementation would format the time properly
            scheduleNode.put("startTime", "2023-01-01T00:00:00Z");
            
            root.put_child("schedule", scheduleNode);
            
            // Retention policy
            boost::property_tree::ptree retentionNode;
            retentionNode.put("keepDaily", profile.retention.keepDaily);
            retentionNode.put("keepWeekly", profile.retention.keepWeekly);
            retentionNode.put("keepMonthly", profile.retention.keepMonthly);
            retentionNode.put("keepYearly", profile.retention.keepYearly);
            retentionNode.put("autoDelete", profile.retention.autoDelete);
            
            root.put_child("retention", retentionNode);
            
            // Create profiles directory if it doesn't exist
            std::filesystem::create_directories(profilesDir);
            
            // Write to file
            boost::property_tree::write_json(profilePath.string(), root);
            
            // Update the profiles vector
            auto it = std::find_if(profiles.begin(), profiles.end(),
                [&profileId](const BackupProfile& p) { return p.name == profileId; });
                
            if (it != profiles.end()) {
                *it = profile;
            } else {
                profiles.push_back(profile);
            }
            
            UTM_INFO("Saved profile: {}", profileId);
            return true;
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to save profile: {}", e.what());
            return false;
        }
    }

    bool deleteProfile(const std::string& profileId) {
        try {
            std::filesystem::path profilePath = profilesDir / (profileId + ".json");
            
            if (!std::filesystem::exists(profilePath)) {
                UTM_ERROR("Profile does not exist: {}", profileId);
                return false;
            }
            
            std::filesystem::remove(profilePath);
            
            // Update the profiles vector
            profiles.erase(std::remove_if(profiles.begin(), profiles.end(),
                [&profileId](const BackupProfile& p) { return p.name == profileId; }),
                profiles.end());
                
            UTM_INFO("Deleted profile: {}", profileId);
            return true;
        } catch (const std::exception& e) {
            UTM_ERROR("Failed to delete profile: {}", e.what());
            return false;
        }
    }

    std::vector<BackupProfile> getAllBackupProfiles() const {
        return profiles;
    }

    std::optional<BackupProfile> getBackupProfile(const std::string& profileId) const {
        auto it = std::find_if(profiles.begin(), profiles.end(),
            [&profileId](const BackupProfile& profile) {
                return profile.name == profileId;
            });
            
        if (it != profiles.end()) {
            return *it;
        }
        
        return std::nullopt;
    }

    const ApplicationConfig& getApplicationConfig() const {
        return appConfig;
    }

    void setApplicationConfig(const ApplicationConfig& config) {
        appConfig = config;
        saveConfig();
    }

private:
    bool initialized;
    std::filesystem::path configDir;
    std::filesystem::path configFile;
    std::filesystem::path profilesDir;
    std::vector<BackupProfile> profiles;
    ApplicationConfig appConfig;
    std::mutex configMutex;
};

// Static singleton instance
namespace {
    std::unique_ptr<Config> configInstance;
    std::once_flag initFlag;

    void createConfigInstance() {
        configInstance = Config::create();
    }
}

// Config implementation
Config::Config() : pImpl(std::make_unique<Impl>()) {
}

Config::~Config() = default;

std::unique_ptr<Config> Config::create() {
    return std::unique_ptr<Config>(new Config());
}

Config& Config::getInstance() {
    std::call_once(initFlag, createConfigInstance);
    return *configInstance;
}

bool Config::initialize(const std::filesystem::path& configDir) {
    return pImpl->initialize(configDir);
}

bool Config::save() {
    return pImpl->saveConfig();
}

const ApplicationConfig& Config::getApplicationConfig() const {
    return pImpl->getApplicationConfig();
}

void Config::setApplicationConfig(const ApplicationConfig& config) {
    pImpl->setApplicationConfig(config);
}

std::optional<BackupProfile> Config::getBackupProfile(const std::string& name) const {
    return pImpl->getBackupProfile(name);
}

std::vector<BackupProfile> Config::getAllBackupProfiles() const {
    return pImpl->getAllBackupProfiles();
}

bool Config::saveBackupProfile(const BackupProfile& profile) {
    return pImpl->saveProfile(profile);
}

bool Config::deleteBackupProfile(const std::string& name) {
    return pImpl->deleteProfile(name);
}

} // namespace utm