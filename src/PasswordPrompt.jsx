import { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { ShieldAlert } from 'lucide-react';

function PasswordPrompt() {
  const [password, setPassword] = useState('');
  const { ipcRenderer } = window.require('electron');

  const handleSubmit = (e) => {
    e.preventDefault();
    ipcRenderer.send('sudo-password-entered', password);
  };

  const handleCancel = () => {
    ipcRenderer.send('sudo-password-entered', null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-center">Administrator Password Required</CardTitle>
          <CardDescription className="text-center">
            OpenConnect requires administrator privileges to create VPN connection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                type="password"
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                OK
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default PasswordPrompt;
