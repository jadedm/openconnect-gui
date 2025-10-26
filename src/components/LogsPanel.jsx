import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Info, ScrollText } from 'lucide-react';

function LogsPanel({ logs, clearLogs }) {
  const logsContainerRef = useRef(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const copyLogs = () => {
    const logsText = logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      // Optional: show a brief success message
      console.log('Logs copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy logs:', err);
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          <CardTitle>Connection Logs</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyLogs} disabled={logs.length === 0}>
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informational Section */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">About Connection Logs</h3>
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              This section provides a complete history of all VPN connection events, including authentication attempts, connection status changes, and error messages.
            </p>
            <div className="mt-2">
              <p className="font-medium mb-1">How to use:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Review detailed connection flow and timing information</li>
                <li>Identify authentication or network errors</li>
                <li>Copy logs to share with support or for troubleshooting</li>
                <li>Clear logs to start fresh when needed</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="h-[450px] overflow-y-auto rounded-md border bg-muted/50 p-4 font-mono text-sm" ref={logsContainerRef}>
          {logs.length === 0 ? (
            <div className="flex gap-2 text-muted-foreground">
              <span className="font-semibold">Ready</span>
              <span>Enter connection details and click Connect</span>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-muted-foreground">[{log.timestamp}]</span>
                  <span className={log.type === 'error' ? 'text-destructive' : log.type === 'success' ? 'font-semibold' : ''}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default LogsPanel;
