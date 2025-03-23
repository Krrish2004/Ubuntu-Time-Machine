#!/bin/bash

# Ubuntu Time Machine Development Run Script
# This script builds and runs the Ubuntu Time Machine application in development mode

# Set strict error handling
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Function to print colored output
print_section() {
  echo -e "\n\033[1;34m==== $1 ====\033[0m"
}

# Check for required tools
check_dependencies() {
  print_section "Checking dependencies"
  
  MISSING_DEPS=()
  
  # Check for C++ build tools
  if ! command -v cmake &> /dev/null; then
    MISSING_DEPS+=("cmake")
  fi
  
  if ! command -v g++ &> /dev/null; then
    MISSING_DEPS+=("g++")
  fi
  
  # Check for Node.js and npm
  if ! command -v node &> /dev/null; then
    MISSING_DEPS+=("nodejs")
  fi
  
  if ! command -v npm &> /dev/null; then
    MISSING_DEPS+=("npm")
  fi
  
  # If there are missing dependencies, print instructions and exit
  if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo "Missing required dependencies: ${MISSING_DEPS[*]}"
    echo "Please install them with:"
    echo "sudo apt install ${MISSING_DEPS[*]}"
    exit 1
  fi
  
  echo "All dependencies found."
}

# Build the core engine
build_core() {
  print_section "Building core engine"
  
  mkdir -p build
  cd build
  cmake .. -DCMAKE_BUILD_TYPE=Debug
  make -j$(nproc)
  cd ..
}

# Build and start the GUI
run_gui() {
  print_section "Setting up GUI"
  
  cd src/gui
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    print_section "Installing npm dependencies"
    npm install
  fi
  
  # Start development server
  print_section "Starting development server"
  npm run dev
}

# Main execution flow
main() {
  print_section "Ubuntu Time Machine Development Runner"
  
  check_dependencies
  
  # Check if we only want to build the core
  if [ "$1" == "--core-only" ]; then
    build_core
    exit 0
  fi
  
  # Check if we only want to run the GUI
  if [ "$1" == "--gui-only" ]; then
    run_gui
    exit 0
  fi
  
  # Default: build core and run GUI
  build_core
  run_gui
}

# Run the main function with all arguments
main "$@" 