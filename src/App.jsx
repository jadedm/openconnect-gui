import { useState, useEffect } from 'react';
import ConnectionForm from './components/ConnectionForm';
import LogsPanel from './components/LogsPanel';
import DiagnosticsPanel from './components/DiagnosticsPanel';
import ProcessMonitor from './components/ProcessMonitor';
import BasicLogs from './components/BasicLogs';
import Navigation from './components/Navigation';
import Alert from './components/Alert';
import { Badge } from './components/ui/badge';

function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('disconnected');
  const [logs, setLogs] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [openConnectInstalled, setOpenConnectInstalled] = useState(true);
  const [ipAddress, setIpAddress] = useState({ current: null, loading: false });
  const [currentServerUrl, setCurrentServerUrl] = useState('');
  const [currentView, setCurrentView] = useState('connection');
  const [problematicRoutesCount, setProblematicRoutesCount] = useState(0);
  const [runningProcessesCount, setRunningProcessesCount] = useState(0);

  useEffect(() => {
    // Initialize the app
    const init = async () => {
      // Check if OpenConnect is installed
      const { installed } = await window.electronAPI.checkOpenConnect();
      setOpenConnectInstalled(installed);

      if (!installed) {
        showAlert('OpenConnect is not installed. Please install it first (brew install openconnect)', 'error');
        addLog('OpenConnect not found. Install with: brew install openconnect', 'error');
      }

      // Load saved profiles
      await loadProfiles();

      // Get initial status
      const status = await window.electronAPI.getStatus();
      setCurrentStatus(status);
    };

    init();

    // Setup IPC listeners
    window.electronAPI.onStatusChanged((status) => {
      setCurrentStatus(status);
    });

    window.electronAPI.onLogMessage((log) => {
      addLog(log.message, log.type);
    });

    window.electronAPI.onConnectionError((error) => {
      showAlert(error, 'error');
      addLog(`Error: ${error}`, 'error');
    });
  }, []);

  const loadProfiles = async () => {
    const result = await window.electronAPI.loadProfiles();
    if (result.success) {
      setProfiles(result.profiles || []);
    } else {
      showAlert(`Failed to load profiles: ${result.error}`, 'error');
    }
  };

  const saveProfiles = async (newProfiles) => {
    const result = await window.electronAPI.saveProfiles(newProfiles);
    if (!result.success) {
      showAlert(`Failed to save profiles: ${result.error}`, 'error');
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prevLogs) => {
      const newLogs = [...prevLogs, { message, type, timestamp }];
      // Limit to 500 entries
      return newLogs.slice(-500);
    });
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('Logs cleared', 'info');
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ show: true, message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setAlert((prev) => ({ ...prev, show: false }));
    }, 5000);
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, show: false }));
  };

  const fetchIpAddress = async () => {
    setIpAddress((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch('https://api.ipify.org?format=json', { timeout: 5000 });
      const data = await response.json();
      setIpAddress({ current: data.ip, loading: false });
      addLog(`Current IP: ${data.ip}`, 'info');
    } catch (error) {
      setIpAddress({ current: 'Unable to fetch', loading: false });
      addLog('Failed to fetch IP address', 'error');
    }
  };

  useEffect(() => {
    // Fetch IP on mount
    fetchIpAddress();
  }, []);

  useEffect(() => {
    // Fetch IP when connection status changes to connected or disconnected
    if (currentStatus === 'connected' || currentStatus === 'disconnected') {
      setTimeout(() => {
        fetchIpAddress();
      }, 2000); // Wait 2 seconds for route changes to take effect
    }
  }, [currentStatus]);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Title bar spacer for macOS traffic lights */}
      <div className="h-10 flex-shrink-0" style={{ WebkitAppRegion: 'drag' }} />

      {/* Header */}
      <header className="px-6 pb-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold">OpenConnect VPN</h1>
        <div className="flex items-center gap-3">
          {ipAddress.current && (
            <div className="text-sm">
              <span className="text-muted-foreground">IP: </span>
              <span className="font-mono font-semibold">
                {ipAddress.loading ? 'Loading...' : ipAddress.current}
              </span>
            </div>
          )}
          <Badge variant={currentStatus === 'connected' ? 'default' : currentStatus === 'connecting' ? 'secondary' : 'outline'}>
            {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
          </Badge>
        </div>
      </header>

      {/* Navigation */}
      <Navigation
        currentView={currentView}
        onViewChange={setCurrentView}
        problematicRoutesCount={problematicRoutesCount}
        runningProcessesCount={runningProcessesCount}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {currentView === 'connection' && (
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConnectionForm
                profiles={profiles}
                setProfiles={setProfiles}
                currentStatus={currentStatus}
                openConnectInstalled={openConnectInstalled}
                showAlert={showAlert}
                addLog={addLog}
                saveProfiles={saveProfiles}
                loadProfiles={loadProfiles}
                onServerChange={setCurrentServerUrl}
              />
              <BasicLogs
                logs={logs}
                onViewAllLogs={() => setCurrentView('logs')}
              />
            </div>
          </div>
        )}

        {currentView === 'logs' && (
          <div className="px-6 py-6">
            <LogsPanel logs={logs} clearLogs={clearLogs} />
          </div>
        )}

        {currentView === 'diagnostics' && (
          <div className="px-6 py-6">
            <DiagnosticsPanel
              showAlert={showAlert}
              addLog={addLog}
              serverUrl={currentServerUrl}
              onProblematicRoutesChange={setProblematicRoutesCount}
              isActive={currentView === 'diagnostics'}
            />
          </div>
        )}

        {currentView === 'processes' && (
          <div className="px-6 py-6">
            <ProcessMonitor onProcessCountChange={setRunningProcessesCount} />
          </div>
        )}
      </div>

      {/* Alert Box */}
      <Alert alert={alert} hideAlert={hideAlert} />

      {/* Footer */}
      <footer className="flex-shrink-0 px-6 py-2 border-t bg-muted/30">
        <div className="flex justify-end">
          <span className="text-xs text-muted-foreground">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
