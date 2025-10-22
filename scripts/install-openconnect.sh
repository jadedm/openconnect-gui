#!/bin/bash

# OpenConnect Installation Helper Script
# This script helps install OpenConnect via Homebrew

set -e

echo "=========================================="
echo "OpenConnect Installation Helper"
echo "=========================================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only"
    exit 1
fi

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed"
    echo ""
    echo "Please install Homebrew first:"
    echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo ""
    exit 1
fi

echo "✅ Homebrew is installed"
echo ""

# Check if OpenConnect is already installed
if command -v openconnect &> /dev/null; then
    VERSION=$(openconnect --version | head -n1)
    echo "✅ OpenConnect is already installed"
    echo "   $VERSION"
    echo ""
    read -p "Do you want to upgrade to the latest version? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "⏳ Upgrading OpenConnect..."
        brew upgrade openconnect
        echo "✅ OpenConnect upgraded successfully!"
    else
        echo "Skipping upgrade"
    fi
else
    echo "⏳ Installing OpenConnect via Homebrew..."
    echo ""

    brew install openconnect

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ OpenConnect installed successfully!"
        VERSION=$(openconnect --version | head -n1)
        echo "   $VERSION"
    else
        echo ""
        echo "❌ Failed to install OpenConnect"
        exit 1
    fi
fi

echo ""
echo "=========================================="
echo "Installation complete!"
echo "=========================================="
echo ""
echo "You can now use the OpenConnect VPN GUI application."
echo ""
