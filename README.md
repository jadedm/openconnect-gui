# OpenConnect VPN GUI

A modern, native-looking macOS application for managing OpenConnect VPN connections, built with **Electron** and **React**.

## Features

- 🔐 Secure VPN connection management with OpenConnect
- ⚛️ Modern React-based UI with component architecture
- 💾 Save and load connection profiles locally
- 📊 Real-time connection status and logging
- 🎨 macOS-native look and feel
- 🔔 System tray integration with quick access
- 🛡️ Secure IPC communication between processes
- ⚡ Fast development with Vite and hot reload

## Prerequisites

### Required
- **Node.js and npm**: For building the application
  ```bash
  brew install node
  ```

### OpenConnect Installation (Choose One Method)

#### Option 1: Homebrew (Recommended)
```bash
brew install openconnect
```
✅ Easy to install and update
✅ Handles all dependencies automatically

#### Option 2: Standalone Build (No Homebrew Required)
```bash
./scripts/install-openconnect-standalone.sh
```
✅ No Homebrew required
✅ Installs to `~/.local/openconnect`
⏱️ Takes 15-30 minutes to build

#### Option 3: Bundled Binary (For Distribution)
See [BUNDLING.md](BUNDLING.md) for instructions on bundling OpenConnect with the app.
✅ Best user experience
✅ No installation required for end users

**Note**: The application will automatically detect OpenConnect from any of these installation methods.

## Technology Stack

- **Electron 28** - Desktop application framework
- **React 18** - UI framework with hooks
- **Vite 5** - Fast build tool and dev server

For detailed information about the React integration, see [REACT-SETUP.md](REACT-SETUP.md).

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Running the Application

To start the application in development mode (with hot reload):

```bash
npm start
```

This will:
1. Start the Vite dev server on `http://localhost:5173`
2. Launch Electron with React hot module replacement enabled
3. Open the application with live reloading on code changes

## Building the Application

To package the application for distribution:

```bash
npm run package
```

This will create a `.dmg` file in the `dist` folder that you can distribute.

## Usage

### Connecting to a VPN

1. **Enter Connection Details:**
   - VPN Server URL (e.g., `vpn.example.com`)
   - Username
   - Password
   - Group/Authgroup (optional)

2. **Click Connect**
   - You'll be prompted for your administrator password
   - OpenConnect requires root privileges to create VPN connections

3. **Monitor Connection**
   - Watch the status badge change from "Disconnected" → "Connecting" → "Connected"
   - View real-time logs in the right panel

### Saving Profiles

1. Fill in the connection form
2. Enter a **Profile Name**
3. Click **Save Profile**

**⚠️ Security Warning:** Passwords are stored in plaintext in a local JSON file. For better security, leave the password field empty in saved profiles and enter it manually each time you connect.

### Using Saved Profiles

1. Select a profile from the dropdown menu
2. The form will auto-fill with saved credentials
3. Click **Connect**

### Deleting Profiles

1. Select a profile from the dropdown
2. Click the trash icon (🗑️) next to the dropdown

## File Structure

```
openconnect-gui/
├── main.js          # Electron main process (handles OpenConnect spawning)
├── preload.js       # Secure IPC bridge
├── index.html       # Application UI
├── renderer.js      # UI logic and event handling
├── styles.css       # Application styling
├── package.json     # Dependencies and scripts
└── README.md        # This file
```

## How It Works

### Architecture

1. **Main Process** (`main.js`):
   - Manages the Electron application lifecycle
   - Spawns OpenConnect as a child process with sudo
   - Handles IPC communication with the renderer
   - Manages the system tray icon and menu
   - Stores/loads connection profiles

2. **Preload Script** (`preload.js`):
   - Provides a secure bridge between main and renderer processes
   - Exposes only necessary APIs to the renderer
   - Implements context isolation for security

3. **Renderer Process** (`renderer.js`):
   - Handles UI interactions
   - Displays connection logs and status
   - Manages profile selection and form validation

### Security Considerations

- **Context Isolation:** Enabled to prevent renderer from accessing Node.js APIs directly
- **Preload Script:** Only exposes whitelisted APIs to the renderer
- **Password Storage:** Passwords are stored in plaintext locally. Consider using macOS Keychain for production use
- **Sudo Privileges:** Required for OpenConnect to function. User is prompted each time

## Troubleshooting

### OpenConnect Not Found

The application includes a built-in installer helper that will automatically appear if OpenConnect is not detected on first launch.

**Manual Installation Options:**

1. **Using Homebrew:**
   ```bash
   brew install openconnect
   ```

2. **Standalone Build (No Homebrew):**
   ```bash
   ./scripts/install-openconnect-standalone.sh
   ```

3. **For App Distribution:**
   Bundle OpenConnect with the app - see [BUNDLING.md](BUNDLING.md)

### Connection Fails Immediately

- Check that your VPN server URL is correct
- Verify your username and password
- Check the logs panel for specific error messages

### Permission Denied

- Ensure you're entering the correct administrator password
- OpenConnect requires root privileges to create network interfaces

### Logs Not Showing

- Logs are captured from OpenConnect's stdout/stderr
- Some VPN servers may produce minimal output
- Check the console (View → Toggle Developer Tools) for application errors

## Data Storage

Connection profiles are stored in:
```
~/Library/Application Support/openconnect-gui/profiles.json
```

This file contains usernames, passwords, and server information in plaintext. Protect this file accordingly.

## Development

### Debug Mode

To open the developer tools:
- macOS: `Cmd + Option + I`
- Or add `mainWindow.webContents.openDevTools();` to `main.js`

### Logs

Application logs from the main process are visible in the terminal where you ran `npm start`.

## Known Limitations

- **Password Storage:** Passwords are stored in plaintext. Future versions should integrate with macOS Keychain
- **Certificate Authentication:** Currently only supports username/password auth
- **Tray Icon:** The app expects a tray icon at `assets/tray-icon.png` (will skip tray if not found)
- **macOS Only:** This application is designed for macOS. Linux and Windows support would require modifications to the sudo prompt and VPN handling

## Future Enhancements

- [ ] macOS Keychain integration for secure password storage
- [ ] Certificate-based authentication support
- [ ] Multi-factor authentication (MFA) support
- [ ] Auto-reconnect on disconnect
- [ ] Network change detection
- [ ] Import/export profiles
- [ ] Custom VPN scripts support

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
