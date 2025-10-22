import { useState, useEffect } from 'react';
import ConnectionForm from './components/ConnectionForm';
import LogsPanel from './components/LogsPanel';
import Alert from './components/Alert';
import { Badge } from './components/ui/badge';

function App() {
  const [profiles, setProfiles] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('disconnected');
  const [logs, setLogs] = useState([]);
  const [alert, setAlert] = useState({ show: false, message: '', type: 'info' });
  const [openConnectInstalled, setOpenConnectInstalled] = useState(true);

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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Title bar spacer for macOS traffic lights */}
      <div className="h-10 flex-shrink-0" style={{ WebkitAppRegion: 'drag' }} />

      {/* Header */}
      <header className="px-6 pb-4 flex items-center justify-between flex-shrink-0">
        <h1 className="text-3xl font-bold">OpenConnect VPN</h1>
        <Badge variant={currentStatus === 'connected' ? 'default' : currentStatus === 'connecting' ? 'secondary' : 'outline'}>
          {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
        </Badge>
      </header>

      {/* Main Content */}
      <div className="flex-1 px-6 pb-6 overflow-auto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ConnectionForm
            profiles={profiles}
            setProfiles={setProfiles}
            currentStatus={currentStatus}
            openConnectInstalled={openConnectInstalled}
            showAlert={showAlert}
            addLog={addLog}
            saveProfiles={saveProfiles}
            loadProfiles={loadProfiles}
          />
          <LogsPanel logs={logs} clearLogs={clearLogs} />
        </div>
      </div>

      {/* Alert Box */}
      <Alert alert={alert} hideAlert={hideAlert} />
    </div>
  );
}

export default App;
