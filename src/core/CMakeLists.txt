cmake_minimum_required(VERSION 3.16)
project(ubuntu-time-machine-core VERSION 2.0.0 LANGUAGES CXX)

# Set C++20 standard
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Set build type if not specified
if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release)
endif()

# Compiler flags
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -pedantic")
set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g -O0 -fsanitize=address")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -O3")

# Find required packages
find_package(Boost 1.71 REQUIRED COMPONENTS filesystem system thread program_options)
find_package(SQLite3 REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# Include directories
include_directories(
  ${PROJECT_SOURCE_DIR}/include
  ${Boost_INCLUDE_DIRS}
  ${SQLite3_INCLUDE_DIRS}
)

# Source files
file(GLOB_RECURSE SOURCES "src/*.cpp")

# Define the library
add_library(utm_core SHARED ${SOURCES})
target_link_libraries(utm_core
  PRIVATE
    ${Boost_LIBRARIES}
    ${SQLite3_LIBRARIES}
    OpenSSL::SSL
    OpenSSL::Crypto
    Threads::Threads
)

# Define the executable
add_executable(utm_core_bin src/main.cpp)
set_target_properties(utm_core_bin PROPERTIES OUTPUT_NAME "utm-core")
target_link_libraries(utm_core_bin PRIVATE utm_core ${Boost_LIBRARIES} ${SQLite3_LIBRARIES} OpenSSL::SSL OpenSSL::Crypto Threads::Threads)

# Installation rules
install(TARGETS utm_core
        LIBRARY DESTINATION lib
        ARCHIVE DESTINATION lib)

install(TARGETS utm_core_bin
        RUNTIME DESTINATION bin)

install(DIRECTORY include/
        DESTINATION include/ubuntu-time-machine)

# Testing
option(BUILD_TESTS "Build the tests" ON)
if(BUILD_TESTS)
  enable_testing()
  add_subdirectory(tests)
endif()

# Documentation
find_package(Doxygen)
if(DOXYGEN_FOUND)
  add_custom_target(docs
    ${DOXYGEN_EXECUTABLE} ${CMAKE_CURRENT_SOURCE_DIR}/Doxyfile
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    COMMENT "Generating API documentation with Doxygen" VERBATIM
  )
endif() 