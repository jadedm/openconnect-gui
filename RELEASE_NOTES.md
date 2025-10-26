# OpenConnect VPN GUI v1.0.0

Native macOS application for managing OpenConnect VPN connections with advanced network diagnostics and process monitoring.

## ✨ Features

### Core VPN Management
- 🔐 Secure VPN connections with interactive authentication
- 💾 Profile management - Save and load multiple VPN profiles with credentials
- 🌐 Real-time public IP address monitoring
- 🔔 System tray integration for quick access

### Advanced Features
- 🧭 **Multi-Tab Interface** - Organized navigation (Connection, Logs, Diagnostics, Processes)
- 🔍 **Network Diagnostics** - Detect and fix problematic routes that block VPN connections
- 📊 **Process Monitor** - View and kill running OpenConnect processes with sudo authentication
- 📝 **Comprehensive Logging** - Real-time connection logs with extensive debugging
- ⚡ **Lazy Loading** - Diagnostics load only when needed for better performance

### User Experience
- 🎨 Modern UI built with shadcn/ui and Tailwind CSS
- 🌓 Dark mode support
- ℹ️ Contextual help in all tabs
- 📌 Version display in footer

## 📦 Installation

### 1. Download
Download `OpenConnect-VPN-1.0.0-arm64.dmg` below (for Apple Silicon Macs: M1/M2/M3)

### 2. Install
1. Open the DMG file
2. Drag "OpenConnect VPN" to Applications folder

### 3. ⚠️ Important: First Launch

macOS will show **"OpenConnect VPN is damaged"** because the app is **not code-signed**.

**Choose one method to bypass the warning:**

**Method 1: Terminal (Recommended)**
```bash
xattr -cr "/Applications/OpenConnect VPN.app"
```
Then launch the app normally.

**Method 2: Right-Click**
1. Right-click on "OpenConnect VPN" in Applications
2. Click "Open"
3. Click "Open" again in the security dialog

**You only need to do this once.** Subsequent launches will work normally.

## ⚙️ Requirements

- **macOS**: 10.13 or later
- **Architecture**: Apple Silicon (M1/M2/M3)
- **OpenConnect**: Install with `brew install openconnect`
- **expect**: Pre-installed on macOS

## 🔒 Security

- ✅ Input validation and command injection prevention
- ✅ Sudo-authenticated privileged operations
- ✅ Context isolation for renderer process
- ✅ Safe command execution using spawn with argument arrays
- ⚠️ Passwords stored in plaintext JSON locally (consider using macOS Keychain)

## 📸 Screenshots

See [README](https://github.com/jadedm/openconnect-gui#screenshots) for screenshots and full documentation.

## 🐛 Known Issues

- App is unsigned (requires manual security bypass on first launch)
- Intel Mac build not included in this release
- Password storage uses plaintext JSON (macOS Keychain integration planned)

## 📝 Full Changelog

### Added
- Multi-tab navigation interface
- Network diagnostics panel with route detection
- Automatic problematic route identification
- Sudo-authenticated route deletion from UI
- Process monitoring and management
- Process killing with sudo authentication
- Recent activity panel (last 10 logs)
- Lazy loading for diagnostics tab
- Comprehensive error handling and logging
- Security hardening with input validation
- Dark mode support throughout
- Contextual help sections
- Footer with version number
- Screenshots in documentation

### Security
- Command injection prevention for PID, routes, and connectivity tests
- Input validation for all system commands
- Safe command execution patterns

---

**Support**: Report issues at https://github.com/jadedm/openconnect-gui/issues

**License**: MIT
