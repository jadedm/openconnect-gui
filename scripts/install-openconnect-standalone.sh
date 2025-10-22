#!/bin/bash

# OpenConnect Standalone Installation Script
# This script installs OpenConnect from source without Homebrew

set -e

echo "=========================================="
echo "OpenConnect Standalone Installer"
echo "=========================================="
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is designed for macOS only"
    exit 1
fi

# Check for required build tools
if ! command -v gcc &> /dev/null && ! command -v clang &> /dev/null; then
    echo "❌ No C compiler found"
    echo ""
    echo "Please install Xcode Command Line Tools first:"
    echo "  xcode-select --install"
    echo ""
    exit 1
fi

echo "✅ Build tools found"
echo ""

# Set installation directory
INSTALL_DIR="$HOME/.local/openconnect"
BIN_DIR="$INSTALL_DIR/bin"
TEMP_DIR="/tmp/openconnect-build"

echo "Installation directory: $INSTALL_DIR"
echo ""

# Create directories
mkdir -p "$BIN_DIR"
mkdir -p "$TEMP_DIR"

# OpenConnect version to install
OPENCONNECT_VERSION="9.12"
GNUTLS_VERSION="3.8.3"
NETTLE_VERSION="3.9.1"
GMP_VERSION="6.3.0"

echo "⏳ Downloading and building dependencies..."
echo "This may take 15-30 minutes depending on your system."
echo ""

cd "$TEMP_DIR"

# Function to download and extract
download_and_extract() {
    local url=$1
    local filename=$(basename "$url")
    local dirname=${filename%.tar.*}

    echo "📥 Downloading $filename..."
    curl -LO "$url" || wget "$url"

    echo "📦 Extracting $filename..."
    tar -xf "$filename"

    echo "$dirname"
}

# Build GMP (required by Nettle)
if [ ! -f "$INSTALL_DIR/lib/libgmp.dylib" ]; then
    echo ""
    echo "Building GMP..."
    dirname=$(download_and_extract "https://ftp.gnu.org/gnu/gmp/gmp-$GMP_VERSION.tar.xz")
    cd "$dirname"
    ./configure --prefix="$INSTALL_DIR" --enable-shared
    make -j$(sysctl -n hw.ncpu)
    make install
    cd "$TEMP_DIR"
fi

# Build Nettle (required by GnuTLS)
if [ ! -f "$INSTALL_DIR/lib/libnettle.dylib" ]; then
    echo ""
    echo "Building Nettle..."
    dirname=$(download_and_extract "https://ftp.gnu.org/gnu/nettle/nettle-$NETTLE_VERSION.tar.gz")
    cd "$dirname"
    PKG_CONFIG_PATH="$INSTALL_DIR/lib/pkgconfig" \
    ./configure --prefix="$INSTALL_DIR" --enable-shared
    make -j$(sysctl -n hw.ncpu)
    make install
    cd "$TEMP_DIR"
fi

# Build GnuTLS
if [ ! -f "$INSTALL_DIR/lib/libgnutls.dylib" ]; then
    echo ""
    echo "Building GnuTLS..."
    dirname=$(download_and_extract "https://www.gnupg.org/ftp/gcrypt/gnutls/v3.8/gnutls-$GNUTLS_VERSION.tar.xz")
    cd "$dirname"
    PKG_CONFIG_PATH="$INSTALL_DIR/lib/pkgconfig" \
    ./configure --prefix="$INSTALL_DIR" --with-included-libtasn1 --with-included-unistring --without-p11-kit
    make -j$(sysctl -n hw.ncpu)
    make install
    cd "$TEMP_DIR"
fi

# Build OpenConnect
echo ""
echo "Building OpenConnect..."
dirname=$(download_and_extract "https://www.infradead.org/openconnect/download/openconnect-$OPENCONNECT_VERSION.tar.gz")
cd "$dirname"

PKG_CONFIG_PATH="$INSTALL_DIR/lib/pkgconfig" \
CFLAGS="-I$INSTALL_DIR/include" \
LDFLAGS="-L$INSTALL_DIR/lib" \
./configure --prefix="$INSTALL_DIR" --with-gnutls --without-openssl

make -j$(sysctl -n hw.ncpu)
make install

# Download vpnc-script
echo ""
echo "📥 Downloading vpnc-script..."
curl -L "https://gitlab.com/openconnect/vpnc-scripts/-/raw/master/vpnc-script" -o "$INSTALL_DIR/bin/vpnc-script"
chmod +x "$INSTALL_DIR/bin/vpnc-script"

# Clean up
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TEMP_DIR"

# Update PATH instructions
echo ""
echo "=========================================="
echo "✅ Installation Complete!"
echo "=========================================="
echo ""
echo "OpenConnect has been installed to:"
echo "  $BIN_DIR/openconnect"
echo ""
echo "To use it, add this to your shell configuration:"
echo "  export PATH=\"$BIN_DIR:\$PATH\""
echo ""
echo "Or create a symlink (requires sudo):"
echo "  sudo ln -s $BIN_DIR/openconnect /usr/local/bin/openconnect"
echo "  sudo ln -s $INSTALL_DIR/bin/vpnc-script /usr/local/bin/vpnc-script"
echo ""
echo "Restart the OpenConnect VPN GUI application to use the installed binary."
echo ""
