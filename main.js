const { app, BrowserWindow, ipcMain, Tray, Menu, dialog, shell } = require('electron');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let splashWindow;
let installerWindow;
let tray;
let openconnectProcess = null;
let connectionStatus = 'disconnected';
const PROFILES_FILE = path.join(app.getPath('userData'), 'profiles.json');
let systemChecksComplete = false;

// Create splash window
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 700,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // Load the splash screen - in dev mode, load from vite server; in production, load from dist
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    splashWindow.loadURL('http://localhost:5173/pages/splash.html');
  } else {
    splashWindow.loadFile(path.join(__dirname, 'dist', 'pages', 'splash.html'));
  }

  splashWindow.center();

  // Handle splash window events
  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

// Perform system checks
async function performSystemChecks() {
  let progress = 0;
  const totalChecks = 6;
  const updateProgress = () => {
    progress++;
    const percent = Math.round((progress / totalChecks) * 100);
    if (splashWindow) {
      splashWindow.webContents.send('splash-progress', percent);
    }
  };

  try {
    // Check 1: Electron runtime
    if (splashWindow) {
      splashWindow.webContents.send('system-check-start', 'Application Runtime');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    if (splashWindow) {
      splashWindow.webContents.send('system-check-complete', 'Application Runtime', true, `Electron v${process.versions.electron}`);
    }
    updateProgress();

    // Check 2: File system access
    if (splashWindow) {
      splashWindow.webContents.send('system-check-start', 'File System Access');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'File System Access', true, 'OK');
      }
    } catch (error) {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'File System Access', false, error.message);
      }
    }
    updateProgress();

    // Check 3: OpenConnect installation
    if (splashWindow) {
      splashWindow.webContents.send('system-check-start', 'OpenConnect Binary');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    const openconnectCheck = await checkOpenConnect();
    if (openconnectCheck.installed) {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'OpenConnect Binary', true, openconnectCheck.path || 'Found');
      }
    } else {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'OpenConnect Binary', false, 'Not installed');
        splashWindow.webContents.send('splash-error', {
          message: 'OpenConnect is not installed. Install with: brew install openconnect',
          action: 'install-openconnect'
        });
      }
      // Don't continue if OpenConnect is not found
      updateProgress();
      updateProgress();
      updateProgress();
      updateProgress();
      return false;
    }
    updateProgress();

    // Check 4: Expect binary
    if (splashWindow) {
      splashWindow.webContents.send('system-check-start', 'Expect Binary');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    const expectCheck = await checkExpect();
    if (expectCheck.installed) {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'Expect Binary', true, expectCheck.path || 'Found');
      }
    } else {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'Expect Binary', false, 'Not installed');
        splashWindow.webContents.send('splash-error', {
          message: 'Expect is not installed. It should be pre-installed on macOS. Try: brew install expect',
          action: null
        });
      }
      updateProgress();
      updateProgress();
      return false;
    }
    updateProgress();

    // Check 5: Network capabilities
    if (splashWindow) {
      splashWindow.webContents.send('system-check-start', 'Network Capabilities');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    if (splashWindow) {
      splashWindow.webContents.send('system-check-complete', 'Network Capabilities', true, 'Available');
    }
    updateProgress();

    // Check 6: Sudo privileges
    if (splashWindow) {
      splashWindow.webContents.send('system-check-start', 'Sudo Privileges');
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    const sudoCheck = await checkSudoAccess();
    if (sudoCheck.available) {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-complete', 'Sudo Privileges', true, 'User has sudo access');
      }
    } else {
      if (splashWindow) {
        splashWindow.webContents.send('system-check-warning', 'Sudo Privileges', 'Sudo required - will prompt when connecting');
      }
    }
    updateProgress();

    // All checks passed
    if (splashWindow) {
      splashWindow.webContents.send('splash-complete');
    }
    systemChecksComplete = true;
    return true;

  } catch (error) {
    console.error('System check error:', error);
    if (splashWindow) {
      splashWindow.webContents.send('splash-error', {
        message: `System check failed: ${error.message}`
      });
    }
    return false;
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // Don't show immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 }
  });

  // Load the app - in dev mode, load from vite server; in production, load from dist
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL('http://localhost:5173/pages/index.html');
    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from built files
    mainWindow.loadFile(path.join(__dirname, 'dist', 'pages', 'index.html'));
  }

  // Prevent window close, minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Create installer helper window
function createInstallerWindow() {
  if (installerWindow) {
    installerWindow.focus();
    return;
  }

  installerWindow = new BrowserWindow({
    width: 700,
    height: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 10, y: 10 },
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true
  });

  // Load the installer helper - in dev mode, load from vite server; in production, load from dist
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    installerWindow.loadURL('http://localhost:5173/pages/installer-helper.html');
  } else {
    installerWindow.loadFile(path.join(__dirname, 'dist', 'pages', 'installer-helper.html'));
  }

  installerWindow.on('closed', () => {
    installerWindow = null;
  });
}

// This function is no longer needed - checks are done in splash screen

// Helper function to check OpenConnect
function checkOpenConnect() {
  return new Promise((resolve) => {
    // Check for OpenConnect in multiple locations
    const locations = [
      '/usr/local/bin/openconnect',           // Homebrew (Intel Mac)
      '/opt/homebrew/bin/openconnect',        // Homebrew (Apple Silicon)
      path.join(process.env.HOME, '.local/openconnect/bin/openconnect'), // Standalone install
      path.join(__dirname, 'bin', 'openconnect'), // Bundled with app (dev)
      path.join(process.resourcesPath, 'bin', 'openconnect'), // Bundled with app (production)
    ];

    // Check each location
    for (const location of locations) {
      if (fs.existsSync(location)) {
        resolve({ installed: true, path: location });
        return;
      }
    }

    // Fallback to 'which' command
    const checkProcess = spawn('which', ['openconnect']);
    checkProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ installed: true, path: 'openconnect' });
      } else {
        resolve({ installed: false });
      }
    });
  });
}

// Check if expect is installed
function checkExpect() {
  return new Promise((resolve) => {
    // Check for expect in common locations
    const locations = [
      '/usr/bin/expect',           // Standard macOS location
      '/opt/homebrew/bin/expect',  // Homebrew (Apple Silicon)
      '/usr/local/bin/expect',     // Homebrew (Intel Mac)
    ];

    // Check each location
    for (const location of locations) {
      if (fs.existsSync(location)) {
        resolve({ installed: true, path: location });
        return;
      }
    }

    // Fallback to 'which' command
    const checkProcess = spawn('which', ['expect']);
    checkProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ installed: true, path: 'expect' });
      } else {
        resolve({ installed: false });
      }
    });
  });
}

// Check if user has sudo access
function checkSudoAccess() {
  return new Promise((resolve) => {
    // Check if user is in admin/sudo group
    // Note: This doesn't guarantee they know the password, just that they have potential access
    const checkProcess = spawn('groups');
    let output = '';

    checkProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    checkProcess.on('close', () => {
      // Check if user is in admin or wheel group (common sudo groups on macOS)
      const hasAdminAccess = output.includes('admin') || output.includes('wheel');
      resolve({ available: hasAdminAccess });
    });
  });
}

// Get the OpenConnect binary path
function getOpenConnectPath() {
  return new Promise((resolve) => {
    checkOpenConnect().then(result => {
      resolve(result.path || 'openconnect');
    });
  });
}

// Get the vpnc-script path
function getVpncScriptPath() {
  const locations = [
    '/opt/homebrew/etc/vpnc/vpnc-script',           // Homebrew (Apple Silicon)
    '/usr/local/etc/vpnc/vpnc-script',              // Homebrew (Intel)
    '/opt/homebrew/opt/vpnc-scripts/etc/vpnc/vpnc-script', // Homebrew alternate
    '/usr/local/opt/vpnc-scripts/etc/vpnc/vpnc-script',    // Homebrew alternate
    path.join(process.env.HOME, '.local/openconnect/etc/vpnc/vpnc-script'), // Standalone
  ];

  // Check each location
  for (const location of locations) {
    if (fs.existsSync(location)) {
      return location;
    }
  }

  // Fallback to just 'vpnc-script' and hope it's in PATH
  return 'vpnc-script';
}

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'assets', 'tray-icon.png'));

  updateTrayMenu();

  tray.on('click', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
}

function updateTrayMenu() {
  // Only update tray if it exists
  if (!tray) {
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Status: ${connectionStatus}`,
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
        }
      }
    },
    {
      label: connectionStatus === 'connected' ? 'Disconnect' : 'Connect',
      enabled: false,
      click: () => {
        // Quick connect with last profile could be implemented here
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`OpenConnect VPN - ${connectionStatus}`);
}

// Handle VPN connection
ipcMain.handle('connect-vpn', async (event, config) => {
  if (openconnectProcess) {
    return { success: false, error: 'Already connected or connecting' };
  }


  try {
    updateStatus('connecting');

    // Get OpenConnect binary path
    const openconnectPath = await getOpenConnectPath();

    // Get vpnc-script path (optional)
    const vpncScriptPath = getVpncScriptPath();

    // Build openconnect command arguments
    const args = [];

    // Only add vpnc-script if found (to match working manual command)
    if (vpncScriptPath && vpncScriptPath !== 'vpnc-script') {
      args.push('-s', vpncScriptPath);
    }

    // Don't add --user flag - let server prompt for it interactively
    // (Server ignores --user and prompts anyway)

    // Add protocol (default is anyconnect)
    const protocol = config.protocol || 'anyconnect';
    args.push(`--protocol=${protocol}`);

    // Add server (keep https:// if present, add it if not)
    let serverUrl = config.server;
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      serverUrl = `https://${serverUrl}`;
    }
    args.push(`--server=${serverUrl}`);

    // Add server certificate pinning if specified
    if (config.serverCert) {
      args.push('--servercert', config.serverCert);
    }

    if (config.authgroup) {
      args.push(`--authgroup=${config.authgroup}`);
    }

    // Add stability and reconnection options
    args.push('--reconnect-timeout', '60'); // Try to reconnect for 60 seconds
    args.push('--dtls-ciphers', 'DEFAULT'); // Use default DTLS ciphers
    args.push('--verbose'); // More detailed logging

    // Log the command being executed (without password)
    sendLog(`Executing: sudo openconnect ${args.join(' ')}`, 'info');

    // Request sudo password from user
    sendLog('[DEBUG] Prompting for sudo password...', 'info');
    const sudoPassword = await promptForSudoPassword();
    if (!sudoPassword) {
      sendLog('[ERROR] No sudo password provided by user', 'error');
      updateStatus('disconnected');
      return { success: false, error: 'Sudo password required' };
    }
    sendLog('[DEBUG] Sudo password received (length: ' + sudoPassword.length + ')', 'info');

    // Use expect script for proper PTY handling
    // In production, it's in extraResources; in dev, it's in project root
    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
    const expectScriptPath = isDev
      ? path.join(__dirname, 'vpn-connect.exp')
      : path.join(process.resourcesPath, 'vpn-connect.exp');

    const expectArgs = [
      expectScriptPath,
      openconnectPath,
      sudoPassword,
      config.username.trim(),
      config.password.trim(),
      ...args
    ];

    sendLog('[DEBUG] Using expect script for interactive authentication', 'info');
    sendLog(`[DEBUG] Expect script path: ${expectScriptPath}`, 'info');

    const sudoProcess = spawn('expect', expectArgs, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    openconnectProcess = sudoProcess;

    // Track connection status
    let connected = false;
    let authError = false;

    // Handle stdout
    sudoProcess.stdout.on('data', (data) => {
      const output = data.toString();
      sendLog(output);

      if ((output.includes('CONNECTED') || output.includes('Established') || output.includes('Configured as')) && !connected) {
        connected = true;
        updateStatus('connected');
        sendLog('Connection established successfully!', 'info');
      }
    });

    // Handle stderr - this is where OpenConnect output appears
    sudoProcess.stderr.on('data', (data) => {
      const output = data.toString();
      sendLog(output);

      // Check for sudo password errors
      if (output.includes('[EXPECT ERROR] Incorrect sudo password')) {
        authError = true;
        sendLog('[ERROR] Sudo password authentication failed!', 'error');
      }

      // Check for VPN authentication errors
      if (output.includes('[EXPECT ERROR] VPN authentication failed')) {
        authError = true;
        sendLog('[ERROR] VPN credentials are incorrect!', 'error');
      }

      // Check for timeout errors
      if (output.includes('[EXPECT ERROR] Timeout')) {
        authError = true;
        sendLog('[ERROR] Connection timeout occurred', 'error');
      }

      if ((output.includes('CONNECTED') || output.includes('Established') || output.includes('Configured as')) && !connected) {
        connected = true;
        updateStatus('connected');
        sendLog('Connection established successfully!', 'info');
      }

      // Ignore vpnc-script errors (connection still works)
      if (output.includes('is not a recognized network service') || output.includes('Error: The parameters were not valid')) {
        sendLog('Note: Route configuration had errors but VPN tunnel is established', 'info');
      }
    });

    // Handle process exit
    sudoProcess.on('close', (code) => {
      const exitTime = new Date().toLocaleTimeString();
      sendLog(`[DEBUG] OpenConnect process exited with code ${code} at ${exitTime}`);

      openconnectProcess = null;
      updateStatus('disconnected');

      if (code !== 0 && code !== null) {
        let errorMessage = `Connection closed with exit code ${code}`;

        // Provide specific error messages based on context
        if (authError) {
          if (code === 1) {
            errorMessage = 'Authentication failed. Please check your credentials.';
          }
        } else if (code === 1) {
          errorMessage = 'Connection failed. This may be due to incorrect sudo password or network issues.';
        }

        sendLog(`[ERROR] ${errorMessage}`, 'error');

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('connection-error', errorMessage);
        }
      } else if (code === 0 && connected) {
        // Clean exit while connected - this is unexpected
        sendLog(`[WARNING] VPN disconnected cleanly. This may be due to:`, 'error');
        sendLog(`  - Network interruption or timeout`, 'error');
        sendLog(`  - Server-side disconnect (idle timeout, policy, etc.)`, 'error');
        sendLog(`  - MTU/DTLS issues`, 'error');

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('connection-error', 'VPN disconnected. Check logs for details.');
        }
      }
    });

    sudoProcess.on('error', (error) => {
      sendLog(`Error: ${error.message}`, 'error');
      openconnectProcess = null;
      updateStatus('disconnected');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('connection-error', error.message);
      }
    });

    return { success: true };
  } catch (error) {
    updateStatus('disconnected');
    return { success: false, error: error.message };
  }
});

// Handle VPN disconnection
ipcMain.handle('disconnect-vpn', async () => {
  return disconnectVPN();
});

function disconnectVPN() {
  if (openconnectProcess) {
    sendLog('Disconnecting...');

    // Close stdin to signal clean shutdown
    try {
      openconnectProcess.stdin.end();
    } catch (e) {
      // Ignore errors if stdin already closed
    }

    // Send SIGINT for graceful shutdown
    openconnectProcess.kill('SIGINT');

    // Give it 5 seconds to shut down gracefully, then force kill
    setTimeout(() => {
      if (openconnectProcess) {
        sendLog('Force killing OpenConnect process...');
        openconnectProcess.kill('SIGKILL');
        openconnectProcess = null;
        updateStatus('disconnected');
      }
    }, 5000);

    return { success: true };
  }
  return { success: false, error: 'Not connected' };
}

// Get connection status
ipcMain.handle('get-status', async () => {
  return connectionStatus;
});

// Save profiles
ipcMain.handle('save-profiles', async (event, profiles) => {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(profiles, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load profiles
ipcMain.handle('load-profiles', async () => {
  try {
    if (fs.existsSync(PROFILES_FILE)) {
      const data = fs.readFileSync(PROFILES_FILE, 'utf8');
      return { success: true, profiles: JSON.parse(data) };
    }
    return { success: true, profiles: [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check if openconnect is installed
ipcMain.handle('check-openconnect', async () => {
  return checkOpenConnect();
});

// Check for running openconnect processes
ipcMain.handle('check-running-processes', async () => {
  return new Promise((resolve) => {
    // Look for actual openconnect VPN processes, not the GUI app
    exec('ps aux | grep -E "sudo.*openconnect|/usr.*openconnect|/opt.*openconnect" | grep -v grep | grep -v "openconnect-gui"', (error, stdout, stderr) => {
      if (error && error.code !== 1) {
        // Code 1 means no processes found, which is not an error
        resolve({ success: false, error: stderr || error.message, processes: [] });
        return;
      }

      const processes = stdout.trim().split('\n').filter(line => line.length > 0);
      resolve({
        success: true,
        processes: processes,
        count: processes.length
      });
    });
  });
});

// Kill a process by PID
ipcMain.handle('kill-process', async (event, pid, sudoPassword) => {
  return new Promise((resolve) => {
    if (!pid) {
      resolve({ success: false, error: 'PID is required' });
      return;
    }

    // Validate PID is a positive integer (prevent command injection)
    const pidNumber = parseInt(pid, 10);
    if (!Number.isInteger(pidNumber) || pidNumber <= 0 || pidNumber.toString() !== pid.toString()) {
      resolve({ success: false, error: 'Invalid PID format' });
      return;
    }

    if (!sudoPassword) {
      resolve({
        success: false,
        error: 'Sudo password required to kill processes',
        needsSudo: true
      });
      return;
    }

    // Use spawn with sudo -S to pass password via stdin
    // PID is validated as integer, safe to use in command
    const sudoProcess = spawn('sudo', ['-S', 'kill', '-9', pidNumber.toString()], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    sudoProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    sudoProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    sudoProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: `Process ${pid} killed successfully` });
      } else {
        // Check for common error messages
        if (stderr.includes('Sorry, try again') || stderr.includes('incorrect password')) {
          resolve({
            success: false,
            error: 'Incorrect sudo password',
            incorrectPassword: true
          });
        } else if (stderr.includes('No such process')) {
          resolve({
            success: false,
            error: `Process ${pid} not found or already terminated`
          });
        } else {
          resolve({
            success: false,
            error: stderr || `Failed to kill process with exit code ${code}`
          });
        }
      }
    });

    sudoProcess.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Send password to sudo
    sudoProcess.stdin.write(sudoPassword + '\n');
    sudoProcess.stdin.end();
  });
});

// Install OpenConnect via the bundled script
ipcMain.handle('install-openconnect', async () => {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'scripts', 'install-openconnect.sh');

    // Check if running in development or production
    const actualScriptPath = fs.existsSync(scriptPath)
      ? scriptPath
      : path.join(process.resourcesPath, 'scripts', 'install-openconnect.sh');

    if (!fs.existsSync(actualScriptPath)) {
      resolve({ success: false, error: 'Installation script not found' });
      return;
    }

    // Open Terminal and run the script
    const command = `osascript -e 'tell application "Terminal" to do script "bash \\"${actualScriptPath}\\"; exit"'`;

    exec(command, (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

// Open Terminal
ipcMain.on('open-terminal', () => {
  shell.openPath('/System/Applications/Utilities/Terminal.app');
});

// Network diagnostics: Get routing table
ipcMain.handle('get-routes', async () => {
  return new Promise((resolve) => {
    exec('netstat -rn', (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
        return;
      }

      // Parse routing table
      const lines = stdout.split('\n');
      const routes = [];
      let inInternetSection = false;

      for (const line of lines) {
        if (line.includes('Internet:')) {
          inInternetSection = true;
          continue;
        }
        if (line.includes('Internet6:')) {
          inInternetSection = false;
          break;
        }
        if (inInternetSection && line.trim() && !line.includes('Destination')) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 4) {
            routes.push({
              destination: parts[0],
              gateway: parts[1],
              flags: parts[2],
              interface: parts[3]
            });
          }
        }
      }

      resolve({ success: true, routes });
    });
  });
});

// Network diagnostics: Test connectivity to a host
ipcMain.handle('test-connectivity', async (event, host, port) => {
  return new Promise((resolve) => {
    if (!host || !port) {
      resolve({ success: false, error: 'Host and port are required' });
      return;
    }

    // Validate port is a number between 1-65535
    const portNumber = parseInt(port, 10);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      resolve({ success: false, error: 'Invalid port number' });
      return;
    }

    // Validate host format (basic hostname/IP validation)
    // Allow alphanumeric, dots, hyphens, and colons (for IPv6)
    const validHostPattern = /^[a-zA-Z0-9\.\-:]+$/;
    if (!validHostPattern.test(host)) {
      resolve({ success: false, error: 'Invalid host format' });
      return;
    }

    const timeout = 5000;
    // Use spawn instead of exec to prevent command injection
    const ncProcess = spawn('nc', ['-zv', '-G', '5', host, portNumber.toString()], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    ncProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ncProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ncProcess.on('close', (code) => {
      const output = stdout + stderr;
      const success = code === 0 && (output.includes('succeeded') || output.includes('open'));

      resolve({
        success,
        host,
        port: portNumber,
        message: output.trim(),
        reachable: success
      });
    });

    ncProcess.on('error', (error) => {
      resolve({
        success: false,
        host,
        port: portNumber,
        message: error.message,
        reachable: false
      });
    });

    // Set timeout
    setTimeout(() => {
      if (!ncProcess.killed) {
        ncProcess.kill();
        resolve({
          success: false,
          host,
          port: portNumber,
          message: 'Connection timed out',
          reachable: false
        });
      }
    }, timeout);
  });
});

// Network diagnostics: Delete a route
ipcMain.handle('delete-route', async (event, destination, sudoPassword) => {
  return new Promise((resolve) => {
    if (!destination) {
      resolve({ success: false, error: 'Destination is required' });
      return;
    }

    // Validate destination format to prevent command injection
    // Allow: IP addresses, CIDR notation, or "default"
    const validDestinationPattern = /^(default|(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?)$/;
    if (!validDestinationPattern.test(destination)) {
      resolve({ success: false, error: 'Invalid destination format' });
      return;
    }

    if (!sudoPassword) {
      resolve({
        success: false,
        error: 'Sudo password required',
        needsSudo: true
      });
      return;
    }

    // Use spawn with sudo -S to pass password via stdin
    // Destination is validated, safe to use in command
    const sudoProcess = spawn('sudo', ['-S', 'route', 'delete', destination], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    sudoProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    sudoProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    sudoProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, message: `Route to ${destination} deleted` });
      } else {
        // Check for common error messages
        if (stderr.includes('Sorry, try again') || stderr.includes('incorrect password')) {
          resolve({
            success: false,
            error: 'Incorrect sudo password',
            incorrectPassword: true
          });
        } else {
          resolve({
            success: false,
            error: stderr || `Failed with exit code ${code}`
          });
        }
      }
    });

    sudoProcess.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    // Send password to sudo
    sudoProcess.stdin.write(sudoPassword + '\n');
    sudoProcess.stdin.end();
  });
});

// Network diagnostics: Get network interfaces
ipcMain.handle('get-network-interfaces', async () => {
  return new Promise((resolve) => {
    exec('ifconfig', (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: stderr || error.message });
        return;
      }

      // Parse interfaces - simplified version
      const interfaces = [];
      const sections = stdout.split(/\n(?=[a-z])/);

      for (const section of sections) {
        const lines = section.split('\n');
        const firstLine = lines[0];
        if (!firstLine) continue;

        const nameMatch = firstLine.match(/^([a-z0-9]+):/);
        if (!nameMatch) continue;

        const name = nameMatch[1];
        const statusMatch = section.match(/status: (\w+)/);
        const inetMatch = section.match(/inet (\d+\.\d+\.\d+\.\d+)/);

        if (inetMatch || statusMatch) {
          interfaces.push({
            name,
            status: statusMatch ? statusMatch[1] : 'unknown',
            ip: inetMatch ? inetMatch[1] : null
          });
        }
      }

      resolve({ success: true, interfaces });
    });
  });
});

// Handle successful OpenConnect installation
ipcMain.on('openconnect-installed', () => {
  if (installerWindow) {
    installerWindow.close();
  }
  // Refresh the main window to re-check OpenConnect
  if (mainWindow) {
    mainWindow.reload();
  }
});

// Splash screen IPC handlers
ipcMain.on('splash-loaded', async () => {
  // Wait a bit for splash to render, then start system checks
  setTimeout(async () => {
    const checksPass = await performSystemChecks();

    if (!checksPass) {
      // System checks failed, keep splash open
      return;
    }
  }, 500);
});

ipcMain.on('splash-ready', () => {
  // System checks passed, create and show main window
  createWindow();

  // Close splash after a short delay
  setTimeout(() => {
    if (splashWindow) {
      splashWindow.close();
    }
  }, 300);

  // Show main window when ready
  if (mainWindow) {
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();

      // Create tray after main window is shown
      try {
        if (!tray) {
          createTray();
        }
      } catch (error) {
        console.log('Tray icon not found, skipping tray creation');
      }
    });
  }
});

ipcMain.on('open-installer', () => {
  createInstallerWindow();
});

// Helper functions
function updateStatus(status) {
  connectionStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-changed', status);
  }
  updateTrayMenu();
}

function sendLog(message, type = 'info') {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-message', { message, type, timestamp: new Date().toISOString() });
  }
}

async function promptForSudoPassword() {
  return new Promise((resolve) => {
    // Create a simple dialog to get sudo password
    sendLog('[DEBUG] Creating sudo password prompt window...', 'info');

    const promptWindow = new BrowserWindow({
      width: 520,
      height: 400,
      parent: mainWindow,
      modal: true,
      show: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

    if (isDev) {
      promptWindow.loadURL('http://localhost:5173/pages/password-prompt.html');
    } else {
      promptWindow.loadFile(path.join(__dirname, 'dist', 'pages', 'password-prompt.html'));
    }

    ipcMain.once('sudo-password-entered', (event, password) => {
      sendLog('[DEBUG] Sudo password entered by user', 'info');
      promptWindow.close();
      resolve(password);
    });

    promptWindow.on('closed', () => {
      sendLog('[DEBUG] Sudo password prompt window closed', 'info');
      // If window was closed without entering password, resolve with null
      resolve(null);
    });

    promptWindow.once('ready-to-show', () => {
      sendLog('[DEBUG] Sudo password prompt ready to show', 'info');
      promptWindow.show();
    });

    // Fallback: show after a short delay if ready-to-show doesn't fire
    setTimeout(() => {
      if (promptWindow && !promptWindow.isDestroyed() && !promptWindow.isVisible()) {
        sendLog('[DEBUG] Showing sudo password prompt (fallback)', 'info');
        promptWindow.show();
      }
    }, 100);
  });
}

// App lifecycle
app.whenReady().then(() => {
  // Show splash screen first
  createSplashWindow();

  // Don't create main window yet - wait for splash to complete

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (openconnectProcess) {
    openconnectProcess.kill('SIGTERM');
  }
});
