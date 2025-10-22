import { useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

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
        <CardTitle>Connection Logs</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyLogs} disabled={logs.length === 0}>
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[600px] overflow-y-auto rounded-md border bg-muted/50 p-4 font-mono text-sm" ref={logsContainerRef}>
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
