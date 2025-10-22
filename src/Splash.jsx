import { useState, useEffect } from 'react';
import { Badge } from './components/ui/badge';
import { Separator } from './components/ui/separator';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, Shield } from 'lucide-react';
import { Button } from './components/ui/button';

function Splash() {
  const [statusText, setStatusText] = useState('Initializing...');
  const [progress, setProgress] = useState(0);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');

    // Listen for system check updates
    ipcRenderer.on('system-check-start', (event, checkName) => {
      setChecks(prev => [...prev, { name: checkName, status: 'checking', message: '' }]);
    });

    ipcRenderer.on('system-check-complete', (event, checkName, success, message) => {
      setChecks(prev =>
        prev.map(check =>
          check.name === checkName
            ? { ...check, status: success ? 'success' : 'error', message }
            : check
        )
      );
    });

    ipcRenderer.on('system-check-warning', (event, checkName, message) => {
      setChecks(prev =>
        prev.map(check =>
          check.name === checkName
            ? { ...check, status: 'warning', message }
            : check
        )
      );
    });

    ipcRenderer.on('splash-progress', (event, percent, message) => {
      setProgress(percent);
      if (message) {
        setStatusText(message);
      }
    });

    ipcRenderer.on('splash-error', (event, errorData) => {
      setStatusText('Setup Required');
      setError(errorData);
    });

    ipcRenderer.on('splash-complete', () => {
      setStatusText('System checks completed successfully!');
      setProgress(100);
    });

    // Notify main process that splash is loaded
    ipcRenderer.send('splash-loaded');

    return () => {
      ipcRenderer.removeAllListeners('system-check-start');
      ipcRenderer.removeAllListeners('system-check-complete');
      ipcRenderer.removeAllListeners('system-check-warning');
      ipcRenderer.removeAllListeners('splash-progress');
      ipcRenderer.removeAllListeners('splash-error');
      ipcRenderer.removeAllListeners('splash-complete');
    };
  }, []);

  const handleInstallClick = () => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.send('open-installer');
  };

  const handleLoginClick = () => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.send('splash-ready');
  };

  const getIconForStatus = (status) => {
    switch (status) {
      case 'checking':
        return <Loader2 className="h-5 w-5 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-foreground">
            <Shield className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold">OpenConnect VPN</h1>
          <Badge variant="outline">Version 1.0.0</Badge>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="text-lg font-medium">{statusText}</div>

          <div className="space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-foreground transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-muted-foreground">{progress}%</div>
          </div>

          <div className="space-y-3">
            {checks.map((check, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-md border bg-card p-3 text-left"
              >
                <div
                  className={
                    check.status === 'checking'
                      ? 'text-muted-foreground'
                      : check.status === 'success'
                      ? 'text-foreground'
                      : check.status === 'error'
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }
                >
                  {getIconForStatus(check.status)}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{check.name}</div>
                  {check.message && (
                    <div className="text-xs text-muted-foreground">{check.message}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="space-y-3 rounded-md border-2 border-destructive bg-destructive/10 p-4">
              <div className="font-semibold">Setup Required</div>
              <div className="text-sm">{error.message}</div>
              {error.action === 'install-openconnect' && (
                <Button onClick={handleInstallClick} className="w-full">
                  Install OpenConnect
                </Button>
              )}
            </div>
          )}

          {progress === 100 && !error && (
            <Button onClick={handleLoginClick} size="lg" className="w-full">
              Continue to OpenConnect
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Splash;
