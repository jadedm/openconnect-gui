import { useState } from 'react';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { Separator } from './components/ui/separator';
import { Copy, Terminal } from 'lucide-react';

function Installer() {
  const [status, setStatus] = useState({ show: false, message: '', type: 'info' });
  const [installBtnText, setInstallBtnText] = useState('Install OpenConnect Automatically');
  const [installBtnDisabled, setInstallBtnDisabled] = useState(false);

  const { ipcRenderer } = window.require('electron');

  const copyCode = (text, button) => {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    });
  };

  const installOpenConnect = async () => {
    setInstallBtnDisabled(true);
    setInstallBtnText('Installing...');
    setStatus({ show: true, message: 'Installing OpenConnect via Homebrew. This may take a few minutes...', type: 'info' });

    try {
      const result = await ipcRenderer.invoke('install-openconnect');

      if (result.success) {
        setStatus({
          show: true,
          message: '✅ OpenConnect installed successfully! You can now close this window and use the application.',
          type: 'success'
        });
        setInstallBtnText('Installed Successfully');
        setTimeout(() => {
          ipcRenderer.send('openconnect-installed');
        }, 2000);
      } else {
        setStatus({
          show: true,
          message: `❌ Installation failed: ${result.error}. Please try installing manually using Terminal.`,
          type: 'error'
        });
        setInstallBtnDisabled(false);
        setInstallBtnText('Try Again');
      }
    } catch (error) {
      setStatus({
        show: true,
        message: `❌ Error: ${error.message}. Please try installing manually using Terminal.`,
        type: 'error'
      });
      setInstallBtnDisabled(false);
      setInstallBtnText('Try Again');
    }
  };

  const openTerminal = () => {
    ipcRenderer.send('open-terminal');
  };

  const checkAgain = async () => {
    setStatus({ show: true, message: 'Checking for OpenConnect...', type: 'info' });

    const result = await ipcRenderer.invoke('check-openconnect');

    if (result.installed) {
      setStatus({
        show: true,
        message: '✅ OpenConnect is now installed! Closing this window...',
        type: 'success'
      });
      setTimeout(() => {
        ipcRenderer.send('openconnect-installed');
      }, 1500);
    } else {
      setStatus({
        show: true,
        message: '❌ OpenConnect is not installed yet. Please install it using one of the methods above.',
        type: 'error'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">OpenConnect Required</h1>
          <p className="text-muted-foreground">
            This application requires OpenConnect to be installed on your system.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="font-semibold">⚠️ Important</div>
              <p className="text-sm text-muted-foreground">
                OpenConnect is a command-line VPN client that must be installed separately. This is
                required because VPN connections need low-level network access.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground font-bold">
                  1
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-semibold">Install Homebrew (if not already installed)</h3>
                  <p className="text-sm text-muted-foreground">
                    Homebrew is a package manager for macOS. Run this command in Terminal:
                  </p>
                  <div className="relative rounded-md border bg-muted p-3 font-mono text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={(e) =>
                        copyCode(
                          '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"',
                          e.target
                        )
                      }
                    >
                      <Copy className="mr-2 h-3 w-3" />
                      Copy
                    </Button>
                    <code className="pr-20">
                      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                    </code>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground font-bold">
                  2
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-semibold">Install OpenConnect</h3>
                  <p className="text-sm text-muted-foreground">
                    Once Homebrew is installed, run this command:
                  </p>
                  <div className="relative rounded-md border bg-muted p-3 font-mono text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={(e) => copyCode('brew install openconnect', e.target)}
                    >
                      <Copy className="mr-2 h-3 w-3" />
                      Copy
                    </Button>
                    <code>brew install openconnect</code>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Or click the button below to run the installer automatically:
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-foreground font-bold">
                  3
                </div>
                <div className="flex-1 space-y-3">
                  <h3 className="text-lg font-semibold">Restart the Application</h3>
                  <p className="text-sm text-muted-foreground">
                    After installation is complete, close and restart this application.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-3">
          <Button disabled={installBtnDisabled} onClick={installOpenConnect} size="lg">
            {installBtnText}
          </Button>
          <Button variant="outline" onClick={openTerminal}>
            <Terminal className="mr-2 h-4 w-4" />
            Open Terminal
          </Button>
          <Button variant="outline" onClick={checkAgain}>
            Check Again
          </Button>
        </div>

        {status.show && (
          <Card
            className={
              status.type === 'error'
                ? 'border-destructive bg-destructive/10'
                : status.type === 'success'
                ? 'border-foreground bg-foreground/10'
                : ''
            }
          >
            <CardContent className="pt-6">
              <p className="text-sm">{status.message}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default Installer;
