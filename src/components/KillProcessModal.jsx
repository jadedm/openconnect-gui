import { useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';

function KillProcessModal({ process, onConfirm, onCancel }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isKilling, setIsKilling] = useState(false);

  if (!process) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }

    setIsKilling(true);
    setError('');

    const result = await onConfirm(password);

    setIsKilling(false);

    if (result && result.success) {
      // Success - modal will be closed by parent
      setPassword('');
      setError('');
    } else if (result && result.error) {
      // Error - keep modal open and show error
      setError(result.error);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">Kill Process</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This will forcefully terminate the OpenConnect process
            </p>
          </div>
        </div>

        <div className="bg-muted p-3 rounded font-mono text-xs">
          <div className="break-all">{process}</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sudo-password">Administrator Password</Label>
            </div>
            <Input
              type="password"
              id="sudo-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoFocus
              className={error ? 'border-destructive' : ''}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Administrator privileges are required to kill processes
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3">
            <p className="text-sm text-amber-900 dark:text-amber-200">
              <strong>Warning:</strong> This will send a SIGKILL (-9) signal to forcefully terminate the process. Any unsaved data or active connections will be lost.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isKilling}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isKilling}>
              {isKilling ? 'Killing...' : 'Kill Process'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default KillProcessModal;
