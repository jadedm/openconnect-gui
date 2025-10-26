import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, RefreshCw, Trash2, Network, CheckCircle2, XCircle, Info } from 'lucide-react';
import RouteDeleteModal from './RouteDeleteModal';

function DiagnosticsPanel({ showAlert, addLog, serverUrl, onProblematicRoutesChange, isActive }) {
  const [routes, setRoutes] = useState([]);
  const [interfaces, setInterfaces] = useState([]);
  const [connectivity, setConnectivity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isActive && !hasLoaded) {
      refreshDiagnostics();
      setHasLoaded(true);
    }
  }, [isActive, hasLoaded]);

  const refreshDiagnostics = async () => {
    setLoading(true);

    try {
      // Get routes
      const routesResult = await window.electronAPI.getRoutes();
      if (routesResult.success) {
        const routesList = routesResult.routes || [];
        setRoutes(routesList);
      } else {
        addLog(`Failed to get routes: ${routesResult.error}`, 'error');
      }

      // Get network interfaces
      const interfacesResult = await window.electronAPI.getNetworkInterfaces();
      if (interfacesResult.success) {
        setInterfaces(interfacesResult.interfaces || []);
      }

      // Test connectivity if server URL is provided
      if (serverUrl) {
        const host = extractHost(serverUrl);
        const port = extractPort(serverUrl);
        if (host) {
          const connResult = await window.electronAPI.testConnectivity(host, port);
          setConnectivity(connResult);
        }
      }
    } catch (error) {
      addLog(`Diagnostics error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const extractHost = (url) => {
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.split(':')[0];
    }
  };

  const extractPort = (url) => {
    try {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      const urlObj = new URL(url);
      return urlObj.port || 443;
    } catch {
      const parts = url.split(':');
      return parts[1] ? parseInt(parts[1]) : 443;
    }
  };

  const isProblematicRoute = (route) => {
    // Check if gateway looks unreachable
    const gateway = route.gateway;

    // Skip default and special routes
    if (route.destination === 'default' || route.gateway === 'link#' || gateway.startsWith('link#')) {
      return false;
    }

    // Check if gateway is in a private range that might be from old network
    const currentIPs = interfaces.map(i => i.ip).filter(Boolean);

    // If gateway is a private IP but not in current network subnets
    if (gateway.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/)) {
      const isInCurrentNetwork = currentIPs.some(ip => {
        const currentSubnet = ip.split('.').slice(0, 3).join('.');
        const gatewaySubnet = gateway.split('.').slice(0, 3).join('.');
        return currentSubnet === gatewaySubnet;
      });

      if (!isInCurrentNetwork) {
        return true;
      }
    }

    return false;
  };

  const handleDeleteRoute = (route) => {
    setRouteToDelete(route);
  };

  const confirmDeleteRoute = async (password) => {
    if (!routeToDelete) return null;

    const destination = routeToDelete.destination;
    addLog(`Attempting to delete route to ${destination}...`, 'info');

    const result = await window.electronAPI.deleteRoute(destination, password);

    if (result.success) {
      showAlert(`Route deleted successfully`, 'success');
      addLog(`Route to ${destination} deleted`, 'info');
      refreshDiagnostics();
      setRouteToDelete(null);
      return { success: true };
    } else if (result.incorrectPassword) {
      addLog(`Incorrect sudo password`, 'error');
      return { success: false, error: 'Incorrect password. Please try again.' };
    } else {
      showAlert(`Failed to delete route: ${result.error}`, 'error');
      addLog(`Failed to delete route: ${result.error}`, 'error');
      setRouteToDelete(null);
      return { success: false, error: result.error };
    }
  };

  const cancelDeleteRoute = () => {
    setRouteToDelete(null);
  };

  const problematicRoutes = routes.filter(isProblematicRoute);

  // Notify parent of problematic routes count
  useEffect(() => {
    if (onProblematicRoutesChange) {
      onProblematicRoutesChange(problematicRoutes.length);
    }
  }, [problematicRoutes.length, onProblematicRoutesChange]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              <CardTitle>Network Diagnostics</CardTitle>
              {problematicRoutes.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {problematicRoutes.length} Issue{problematicRoutes.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={refreshDiagnostics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-6">
        {/* Informational Section */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">About Network Diagnostics</h3>
          </div>
          <div className="text-xs text-blue-800 dark:text-blue-200 space-y-2">
            <p>
              This tool helps diagnose and fix network issues that may prevent VPN connections. It provides insights into your system's network configuration.
            </p>
            <div className="mt-3">
              <p className="font-medium mb-1">What to look for:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Problematic Routes:</strong> Stale network routes pointing to unreachable gateways (often from previous network connections or VPNs)</li>
                <li><strong>Connectivity Test:</strong> Check if your VPN server is reachable from your current network</li>
                <li><strong>Network Interfaces:</strong> View active network interfaces and their IP addresses</li>
              </ul>
            </div>
            <p className="mt-3">
              <strong>Common Issue:</strong> If you see a route with gateway like <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">172.20.10.1</code> but you're not on that network anymore,
              it's likely blocking your VPN connection. Click <strong>Delete</strong> to remove it.
            </p>
          </div>
        </div>
        {/* Connectivity Test */}
        {connectivity && (
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              {connectivity.reachable ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              VPN Server Connectivity
            </h3>
            <div className="text-sm bg-muted p-3 rounded">
              <div><span className="font-medium">Host:</span> {connectivity.host}:{connectivity.port}</div>
              <div><span className="font-medium">Status:</span> {connectivity.reachable ? 'Reachable ✓' : 'Unreachable ✗'}</div>
              {connectivity.message && (
                <div className="mt-2 text-xs text-muted-foreground">{connectivity.message}</div>
              )}
            </div>
          </div>
        )}

        {/* Network Interfaces */}
        <div>
          <h3 className="font-semibold mb-2">Active Network Interfaces</h3>
          <div className="space-y-2">
            {interfaces.filter(i => i.ip).map((iface) => (
              <div key={iface.name} className="text-sm bg-muted p-2 rounded flex justify-between items-center">
                <div>
                  <span className="font-mono font-semibold">{iface.name}</span>
                  <span className="mx-2">→</span>
                  <span className="font-mono">{iface.ip}</span>
                </div>
                <Badge variant={iface.status === 'active' ? 'default' : 'outline'} className="text-xs">
                  {iface.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Problematic Routes */}
        {problematicRoutes.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Problematic Routes Detected
            </h3>
            <div className="space-y-2">
              {problematicRoutes.map((route, idx) => (
                <div key={idx} className="text-sm bg-destructive/10 border border-destructive/20 p-3 rounded">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-mono">
                        <span className="font-semibold">{route.destination}</span>
                        <span className="mx-2">→</span>
                        <span>{route.gateway}</span>
                        <span className="mx-2 text-muted-foreground">via {route.interface}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        This route points to a gateway that may not be reachable on your current network.
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteRoute(route)}
                      className="ml-4"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Stale routes can prevent VPN connections. Delete problematic routes to fix connectivity issues.</p>
            </div>
          </div>
        )}

        {/* All Routes */}
        <div>
          <h3 className="font-semibold mb-2">All Routes ({routes.length})</h3>
          <div className="max-h-64 overflow-y-auto border rounded">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold">Destination</th>
                  <th className="text-left p-2 font-semibold">Gateway</th>
                  <th className="text-left p-2 font-semibold">Flags</th>
                  <th className="text-left p-2 font-semibold">Interface</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {routes.map((route, idx) => (
                  <tr key={idx} className={`border-t ${isProblematicRoute(route) ? 'bg-destructive/5' : ''}`}>
                    <td className="p-2">{route.destination}</td>
                    <td className="p-2">{route.gateway}</td>
                    <td className="p-2 text-muted-foreground">{route.flags}</td>
                    <td className="p-2">{route.interface}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
      </Card>

      {/* Delete Route Confirmation Modal */}
      <RouteDeleteModal
        route={routeToDelete}
        onConfirm={confirmDeleteRoute}
        onCancel={cancelDeleteRoute}
      />
    </>
  );
}

export default DiagnosticsPanel;
