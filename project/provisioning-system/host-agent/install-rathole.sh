#!/bin/bash

# Rathole Setup Script for Host Agents
# This script downloads and installs the Rathole client binary

set -e

RATHOLE_VERSION="0.5.0"
RATHOLE_URL="https://github.com/rapiz1/rathole/releases/download/v${RATHOLE_VERSION}/rathole-x86_64-unknown-linux-gnu.zip"
INSTALL_DIR="/usr/local/bin"
TEMP_DIR="/tmp/rathole-install"

echo "Installing Rathole client v${RATHOLE_VERSION}..."

# Create temporary directory
mkdir -p "${TEMP_DIR}"
cd "${TEMP_DIR}"

# Download Rathole binary
echo "Downloading Rathole from ${RATHOLE_URL}..."
wget -q "${RATHOLE_URL}" -O rathole.zip

# Extract and install
echo "Extracting and installing..."
unzip -q rathole.zip
chmod +x rathole
sudo mv rathole "${INSTALL_DIR}/rathole"

# Verify installation
echo "Verifying installation..."
"${INSTALL_DIR}/rathole" --version

# Create data directory for Rathole configs
sudo mkdir -p /data/rathole
sudo chmod 755 /data/rathole

# Cleanup
cd /
rm -rf "${TEMP_DIR}"

echo "Rathole client installed successfully to ${INSTALL_DIR}/rathole"
echo "Config directory created at /data/rathole"
