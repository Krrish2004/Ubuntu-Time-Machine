#include "utm/system_utils.hpp"
#include "utm/logging.hpp"
#include <cstdlib>
#include <iostream>
#include <filesystem>
#include <fstream>
#include <thread>
#include <array>

#include <boost/process.hpp>
#include <boost/algorithm/string.hpp>

#include <pwd.h>     // For getpwuid
#include <sys/statvfs.h>  // For statvfs
#include <grp.h>     // For getgrgid
#include <unistd.h>  // For getuid, getgid

namespace utm::system {

// Get the application data directory
std::filesystem::path getAppDataDirectory() {
    try {
        // First, check XDG_DATA_HOME environment variable
        const char* xdgDataHome = std::getenv("XDG_DATA_HOME");
        if (xdgDataHome && *xdgDataHome) {
            std::filesystem::path dataDir = xdgDataHome;
            dataDir /= "ubuntu-time-machine";
            
            // Create directory if it doesn't exist
            if (!std::filesystem::exists(dataDir)) {
                std::filesystem::create_directories(dataDir);
            }
            
            return dataDir;
        }
        
        // Fallback to ~/.local/share
        const char* homeDir = std::getenv("HOME");
        if (!homeDir || !*homeDir) {
            struct passwd* pw = getpwuid(getuid());
            if (pw) {
                homeDir = pw->pw_dir;
            }
        }
        
        if (homeDir && *homeDir) {
            std::filesystem::path dataDir = homeDir;
            dataDir /= ".local/share/ubuntu-time-machine";
            
            // Create directory if it doesn't exist
            if (!std::filesystem::exists(dataDir)) {
                std::filesystem::create_directories(dataDir);
            }
            
            return dataDir;
        }
        
        // Last resort: use /tmp
        getLogger().warning("Could not determine home directory, using /tmp as fallback");
        std::filesystem::path tmpDir = "/tmp/ubuntu-time-machine";
        
        // Create directory if it doesn't exist
        if (!std::filesystem::exists(tmpDir)) {
            std::filesystem::create_directories(tmpDir);
        }
        
        return tmpDir;
    }
    catch (const std::exception& e) {
        getLogger().error("Failed to get app data directory: " + std::string(e.what()));
        return "/tmp/ubuntu-time-machine";
    }
}

// Check if a path is a valid backup destination
bool isValidBackupDestination(const std::filesystem::path& path) {
    try {
        // Check if path exists
        if (!std::filesystem::exists(path)) {
            getLogger().error("Backup destination does not exist: " + path.string());
            return false;
        }
        
        // Check if it's a directory
        if (!std::filesystem::is_directory(path)) {
            getLogger().error("Backup destination is not a directory: " + path.string());
            return false;
        }
        
        // Check if it's writable by creating a temporary file
        std::filesystem::path testFile = path / "utm_write_test";
        std::ofstream file(testFile);
        if (!file) {
            getLogger().error("Backup destination is not writable: " + path.string());
            return false;
        }
        
        file.close();
        std::filesystem::remove(testFile);
        
        return true;
    }
    catch (const std::exception& e) {
        getLogger().error("Failed to validate backup destination: " + std::string(e.what()));
        return false;
    }
}

// Get available space on a path
std::uintmax_t getAvailableSpace(const std::filesystem::path& path) {
    try {
        struct statvfs stat;
        if (statvfs(path.c_str(), &stat) != 0) {
            getLogger().error("Failed to get available space for " + path.string() + ": " + std::strerror(errno));
            return 0;
        }
        
        return static_cast<uint64_t>(stat.f_bavail) * stat.f_frsize;
    }
    catch (const std::exception& e) {
        getLogger().error("Exception getting available space: " + std::string(e.what()));
        return 0;
    }
}

// Execute a command and return its output
std::pair<int, std::string> executeCommandWithOutput(const std::string& command) {
    try {
        std::array<char, 4096> buffer;
        std::string result;
        FILE* pipe = popen(command.c_str(), "r");
        
        if (!pipe) {
            getLogger().error("Failed to execute command: " + command);
            return {-1, ""};
        }
        
        while (fgets(buffer.data(), buffer.size(), pipe) != nullptr) {
            result += buffer.data();
        }
        
        int exitCode = pclose(pipe);
        return {exitCode, result};
    }
    catch (const std::exception& e) {
        getLogger().error("Exception executing command: " + std::string(e.what()));
        return {-1, ""};
    }
}

// Get system information
SystemInfo getSystemInfo() {
    SystemInfo info;
    
    try {
        // Get hostname
        char hostname[1024];
        if (gethostname(hostname, sizeof(hostname)) == 0) {
            info.hostname = hostname;
        } else {
            info.hostname = "unknown";
        }
        
        // Get current user info
        struct passwd* pw = getpwuid(getuid());
        if (pw) {
            info.username = pw->pw_name;
            info.uid = pw->pw_uid;
            info.gid = pw->pw_gid;
        }
        
        // Get CPU info
        int cores = 0;
        std::string model;
        
        std::ifstream cpuinfo("/proc/cpuinfo");
        if (cpuinfo) {
            std::string line;
            while (std::getline(cpuinfo, line)) {
                if (line.find("processor") == 0) {
                    cores++;
                }
                else if (line.find("model name") == 0) {
                    size_t pos = line.find(':');
                    if (pos != std::string::npos) {
                        model = line.substr(pos + 2);
                    }
                }
            }
        }
        
        info.cpuCores = cores;
        
        // Check if running as root
        info.isRoot = (getuid() == 0);
        
        // Get groups
        int ngroups = getgroups(0, nullptr);
        if (ngroups > 0) {
            std::vector<gid_t> groups(ngroups);
            if (getgroups(ngroups, groups.data()) != -1) {
                for (int i = 0; i < ngroups; i++) {
                    struct group* gr = getgrgid(groups[i]);
                    if (gr) {
                        info.groups.push_back(gr->gr_name);
                    }
                }
            }
        }
        
        // Check sudo access
        info.hasSudo = std::filesystem::exists("/var/run/sudo/ts/" + std::to_string(info.uid));
        
        // Get memory info
        uint64_t totalMem = 0;
        uint64_t freeMem = 0;
        
        std::ifstream meminfo("/proc/meminfo");
        if (meminfo) {
            std::string line;
            while (std::getline(meminfo, line)) {
                if (line.find("MemTotal:") == 0) {
                    std::istringstream iss(line);
                    std::string name;
                    uint64_t value;
                    std::string unit;
                    iss >> name >> value >> unit;
                    totalMem = value * 1024;  // Convert from kB to bytes
                }
                else if (line.find("MemAvailable:") == 0) {
                    std::istringstream iss(line);
                    std::string name;
                    uint64_t value;
                    std::string unit;
                    iss >> name >> value >> unit;
                    freeMem = value * 1024;  // Convert from kB to bytes
                }
            }
        }
        
        info.totalMemory = totalMem;
        info.freeMemory = freeMem;
        
        // Get disk space
        try {
            std::string df_cmd = "df / --output=size,used,avail -B 1";
            auto [exitCode, df_output] = executeCommandWithOutput(df_cmd);
            std::istringstream iss(df_output);
            std::string line;
            
            // Skip header
            std::getline(iss, line);
            
            // Parse values
            if (std::getline(iss, line)) {
                std::istringstream linestream(line);
                uint64_t total, used, available;
                linestream >> total >> used >> available;
                
                // No need to set these since SystemInfo doesn't have disk fields
                // But we could extend it if needed
            }
        } catch (const std::exception& e) {
            getLogger().error("Failed to get disk space: " + std::string(e.what()));
        }
        
        // Get uptime
        std::ifstream uptime_file("/proc/uptime");
        if (uptime_file) {
            double uptime;
            uptime_file >> uptime;
            // No need to set since SystemInfo doesn't have uptime field
        }
        
        // Get OS info
        std::ifstream os_release("/etc/os-release");
        if (os_release) {
            std::string line;
            while (std::getline(os_release, line)) {
                if (line.find("NAME=") == 0) {
                    size_t pos = line.find('=');
                    if (pos != std::string::npos) {
                        info.osName = line.substr(pos + 1);
                        boost::trim_if(info.osName, [](char c) { return c == '"' || c == '\'' || std::isspace(c); });
                    }
                }
                else if (line.find("VERSION=") == 0) {
                    size_t pos = line.find('=');
                    if (pos != std::string::npos) {
                        info.osVersion = line.substr(pos + 1);
                        boost::trim_if(info.osVersion, [](char c) { return c == '"' || c == '\'' || std::isspace(c); });
                    }
                }
            }
        }
        
        // Check for desktop session
        const char* xdg_session = std::getenv("XDG_SESSION_TYPE");
        info.isDesktopSession = (xdg_session != nullptr && std::string(xdg_session) != "tty");
        
        // Get desktop environment
        const char* xdg_desktop = std::getenv("XDG_CURRENT_DESKTOP");
        if (xdg_desktop) {
            info.desktopEnv = xdg_desktop;
        }
        
        return info;
    }
    catch (const std::exception& e) {
        getLogger().error("Failed to get system info: " + std::string(e.what()));
        return info;
    }
}

// Get hardware-specific information for backup verification
std::string getHardwareIdentifier() {
    try {
        // Try to get DMI ID
        std::ifstream dmi_id("/sys/class/dmi/id/product_uuid");
        if (dmi_id) {
            std::string uuid;
            dmi_id >> uuid;
            if (!uuid.empty()) {
                return uuid;
            }
        }
        
        // Fallback: use hostname + CPU model
        SystemInfo info = getSystemInfo();
        return info.hostname + "-" + std::to_string(info.cpuCores) + "cpu";
    }
    catch (const std::exception& e) {
        getLogger().error("Failed to get hardware identifier: " + std::string(e.what()));
        return "unknown-hardware";
    }
}

// Check if running with administrator privileges
bool isRunningAsAdmin() {
    return getuid() == 0;
}

// Check if backup service is installed
bool isBackupServiceInstalled() {
    try {
        std::string cmd = "systemctl is-enabled ubuntu-time-machine.service";
        auto [exitCode, _] = executeCommandWithOutput(cmd);
        return (exitCode == 0);
    } catch (const std::exception& e) {
        UTM_ERROR("Failed to check if backup service is installed: {}", e.what());
        return false;
    }
}

// Install backup service
bool installBackupService() {
    try {
        // Check if running as root
        if (!isRunningAsAdmin()) {
            getLogger().error("Installing backup service requires root privileges");
            return false;
        }
        
        // Create service file
        std::string servicePath = "/etc/systemd/system/ubuntu-time-machine.service";
        std::ofstream serviceFile(servicePath);
        if (!serviceFile) {
            getLogger().error("Failed to create service file: " + servicePath);
            return false;
        }
        
        // Write service definition
        std::string appDataDir = getAppDataDirectory().string();
        serviceFile << "[Unit]\n"
                    << "Description=Ubuntu Time Machine Backup Service\n"
                    << "After=network.target\n\n"
                    << "[Service]\n"
                    << "Type=simple\n"
                    << "ExecStart=" << appDataDir << "/bin/utm-backup-service\n"
                    << "WorkingDirectory=" << appDataDir << "\n"
                    << "Restart=on-failure\n"
                    << "RestartSec=10\n\n"
                    << "[Install]\n"
                    << "WantedBy=multi-user.target\n";
        
        serviceFile.close();
        
        // Enable the service
        std::string cmd1 = "systemctl daemon-reload";
        auto [exitCode1, _] = executeCommandWithOutput(cmd1);
        if (exitCode1 != 0) {
            UTM_ERROR("Failed to reload systemd daemon: {}", exitCode1);
            return false;
        }

        std::string cmd2 = "systemctl enable ubuntu-time-machine.service";
        auto [exitCode2, __] = executeCommandWithOutput(cmd2);
        if (exitCode2 != 0) {
            UTM_ERROR("Failed to enable backup service: {}", exitCode2);
            return false;
        }
        
        getLogger().info("Backup service installed successfully");
        return true;
    }
    catch (const std::exception& e) {
        getLogger().error("Failed to install backup service: " + std::string(e.what()));
        return false;
    }
}

// Uninstall backup service
bool uninstallBackupService() {
    try {
        // Check if running as root
        if (!isRunningAsAdmin()) {
            getLogger().error("Uninstalling backup service requires root privileges");
            return false;
        }
        
        // Stop and disable the service
        std::string cmd1 = "systemctl stop ubuntu-time-machine.service";
        auto [exitCode1, _] = executeCommandWithOutput(cmd1);
        if (exitCode1 != 0) {
            UTM_ERROR("Failed to stop backup service: {}", exitCode1);
            // Continue anyway to try and disable it
        }

        std::string cmd2 = "systemctl disable ubuntu-time-machine.service";
        auto [exitCode2, __] = executeCommandWithOutput(cmd2);
        if (exitCode2 != 0) {
            UTM_ERROR("Failed to disable backup service: {}", exitCode2);
            // Continue anyway to try and remove the file
        }
        
        // Remove service file
        std::string servicePath = "/etc/systemd/system/ubuntu-time-machine.service";
        if (std::filesystem::exists(servicePath)) {
            std::filesystem::remove(servicePath);
        }
        
        // Reload systemd
        std::string cmd3 = "systemctl daemon-reload";
        auto [exitCode3, ___] = executeCommandWithOutput(cmd3);
        if (exitCode3 != 0) {
            getLogger().warning("Failed to reload systemd");
            // Continue anyway
        }
        
        getLogger().info("Backup service uninstalled successfully");
        return true;
    }
    catch (const std::exception& e) {
        getLogger().error("Failed to uninstall backup service: " + std::string(e.what()));
        return false;
    }
}

} // namespace utm::system 