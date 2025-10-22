import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';

function LogsPanel({ logs, clearLogs }) {
  const logsContainerRef = useRef(null);
  const [runningProcesses, setRunningProcesses] = useState([]);
  const [checkingProcesses, setCheckingProcesses] = useState(false);

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

  const checkProcesses = async () => {
    setCheckingProcesses(true);
    try {
      const result = await window.electronAPI.checkRunningProcesses();
      if (result.success) {
        setRunningProcesses(result.processes);
      } else {
        setRunningProcesses([]);
      }
    } catch (error) {
      console.error('Error checking processes:', error);
      setRunningProcesses([]);
    } finally {
      setCheckingProcesses(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Connection Logs</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={checkProcesses} disabled={checkingProcesses}>
            {checkingProcesses ? 'Checking...' : 'Check Status'}
          </Button>
          <Button variant="outline" size="sm" onClick={copyLogs} disabled={logs.length === 0}>
            Copy
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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

        <Separator />

        {/* Running Processes Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">Running OpenConnect Processes</h3>
          <div className="rounded-md border bg-muted/50">
            {runningProcesses.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">No running processes found. Click "Check Status" to scan.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="p-2 text-left font-semibold">User</th>
                      <th className="p-2 text-left font-semibold">PID</th>
                      <th className="p-2 text-left font-semibold">CPU%</th>
                      <th className="p-2 text-left font-semibold">MEM%</th>
                      <th className="p-2 text-left font-semibold">Status</th>
                      <th className="p-2 text-left font-semibold">Time</th>
                      <th className="p-2 text-left font-semibold">Command</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningProcesses.map((process, index) => {
                      const parts = process.trim().split(/\s+/);
                      const user = parts[0] || '';
                      const pid = parts[1] || '';
                      const cpu = parts[2] || '';
                      const mem = parts[3] || '';
                      const status = parts[7] || '';
                      const time = parts[9] || '';
                      const command = parts.slice(10).join(' ') || '';

                      return (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-2">{user}</td>
                          <td className="p-2">{pid}</td>
                          <td className="p-2">{cpu}</td>
                          <td className="p-2">{mem}</td>
                          <td className="p-2">{status}</td>
                          <td className="p-2">{time}</td>
                          <td className="p-2 break-all">{command}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LogsPanel;
