cmake_minimum_required(VERSION 3.16)
project(utm-system-integration)

# Ensure file permissions are correct for installation scripts
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/preinst
               ${CMAKE_CURRENT_BINARY_DIR}/preinst
               @ONLY
               FILE_PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE)

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/postinst
               ${CMAKE_CURRENT_BINARY_DIR}/postinst
               @ONLY
               FILE_PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE)

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/prerm
               ${CMAKE_CURRENT_BINARY_DIR}/prerm
               @ONLY
               FILE_PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE)

configure_file(${CMAKE_CURRENT_SOURCE_DIR}/postrm
               ${CMAKE_CURRENT_BINARY_DIR}/postrm
               @ONLY
               FILE_PERMISSIONS OWNER_READ OWNER_WRITE OWNER_EXECUTE GROUP_READ GROUP_EXECUTE WORLD_READ WORLD_EXECUTE)

# Configure desktop file
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/ubuntu-time-machine.desktop
               ${CMAKE_CURRENT_BINARY_DIR}/ubuntu-time-machine.desktop
               @ONLY)

# Configure systemd service file
configure_file(${CMAKE_CURRENT_SOURCE_DIR}/ubuntu-time-machine.service
               ${CMAKE_CURRENT_BINARY_DIR}/ubuntu-time-machine.service
               @ONLY)
