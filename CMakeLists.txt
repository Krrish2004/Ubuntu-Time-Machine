cmake_minimum_required(VERSION 3.16)
project(ubuntu-time-machine VERSION 2.0.0 LANGUAGES CXX)

# Add main subdirectories
add_subdirectory(src/core)
add_subdirectory(src/cli)
add_subdirectory(src/system_integration)

# Determine installation directories according to GNU standards
include(GNUInstallDirs)

# Installation paths
set(UTM_INSTALL_BINDIR "${CMAKE_INSTALL_BINDIR}")
set(UTM_INSTALL_LIBDIR "${CMAKE_INSTALL_LIBDIR}")
set(UTM_INSTALL_INCLUDEDIR "${CMAKE_INSTALL_INCLUDEDIR}/ubuntu-time-machine")
set(UTM_INSTALL_DATADIR "${CMAKE_INSTALL_DATADIR}/ubuntu-time-machine")
set(UTM_INSTALL_SYSCONFDIR "${CMAKE_INSTALL_SYSCONFDIR}/ubuntu-time-machine")
set(UTM_INSTALL_DOCDIR "${CMAKE_INSTALL_DOCDIR}")

# Install Desktop and Icon files
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/system_integration/ubuntu-time-machine.desktop"
        DESTINATION "${CMAKE_INSTALL_DATADIR}/applications")
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/gui/assets/icons/utm-512x512.png"
        DESTINATION "${CMAKE_INSTALL_DATADIR}/icons/hicolor/512x512/apps"
        RENAME "ubuntu-time-machine.png")
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/gui/assets/icons/utm-256x256.png"
        DESTINATION "${CMAKE_INSTALL_DATADIR}/icons/hicolor/256x256/apps"
        RENAME "ubuntu-time-machine.png")
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/gui/assets/icons/utm-128x128.png"
        DESTINATION "${CMAKE_INSTALL_DATADIR}/icons/hicolor/128x128/apps"
        RENAME "ubuntu-time-machine.png")
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/gui/assets/icons/utm-64x64.png"
        DESTINATION "${CMAKE_INSTALL_DATADIR}/icons/hicolor/64x64/apps"
        RENAME "ubuntu-time-machine.png")

# Install systemd service file
install(FILES "${CMAKE_CURRENT_SOURCE_DIR}/src/system_integration/ubuntu-time-machine.service"
        DESTINATION "${CMAKE_INSTALL_LIBDIR}/systemd/system")

# Install documentation
install(FILES 
        "${CMAKE_CURRENT_SOURCE_DIR}/README.md"
        "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE"
        DESTINATION "${UTM_INSTALL_DOCDIR}")

# Install GUI components
install(DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/src/gui/dist/"
        DESTINATION "${UTM_INSTALL_DATADIR}/gui")

# CPack configuration for packaging
include(InstallRequiredSystemLibraries)
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Ubuntu Time Machine - Professional backup solution for Ubuntu")
set(CPACK_PACKAGE_VENDOR "Ubuntu Time Machine Team")
set(CPACK_PACKAGE_DESCRIPTION_FILE "${CMAKE_CURRENT_SOURCE_DIR}/README.md")
set(CPACK_RESOURCE_FILE_LICENSE "${CMAKE_CURRENT_SOURCE_DIR}/LICENSE")
set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_MINOR})
set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_PATCH})
set(CPACK_PACKAGE_INSTALL_DIRECTORY "Ubuntu-Time-Machine")

# Debian package settings
set(CPACK_GENERATOR "DEB")
set(CPACK_DEBIAN_PACKAGE_MAINTAINER "Ubuntu Time Machine Team <contact@ubuntutimemachine.org>")
set(CPACK_DEBIAN_PACKAGE_SECTION "utils")
set(CPACK_DEBIAN_PACKAGE_DEPENDS "libboost-filesystem-dev, libboost-system-dev, libboost-thread-dev, libboost-program-options-dev, libsqlite3-0, libssl-dev, nodejs (>= 14.0.0), libc6")
set(CPACK_DEBIAN_PACKAGE_RECOMMENDS "gnome-shell")
set(CPACK_DEBIAN_PACKAGE_SUGGESTS "dbus")
set(CPACK_DEBIAN_PACKAGE_PRIORITY "optional")
set(CPACK_DEBIAN_PACKAGE_HOMEPAGE "https://ubuntutimemachine.org")

# Set up pre and post installation scripts
set(CPACK_DEBIAN_PACKAGE_CONTROL_EXTRA
    "${CMAKE_CURRENT_SOURCE_DIR}/src/system_integration/preinst;${CMAKE_CURRENT_SOURCE_DIR}/src/system_integration/postinst;${CMAKE_CURRENT_SOURCE_DIR}/src/system_integration/prerm;${CMAKE_CURRENT_SOURCE_DIR}/src/system_integration/postrm")

include(CPack) 