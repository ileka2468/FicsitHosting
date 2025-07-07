import React, { useState, useEffect } from 'react';
import { ProvisionServerModal } from './ProvisionServerModal';
import { API_ENDPOINTS } from '../../config/api';

interface GameServer {
  serverId: string;
  serverName: string;
  userId: string;
  status: 'PROVISIONING' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'STOPPED' | 'ERROR';
  gamePort: number;
  beaconPort: number;
  ramAllocation: number;
  cpuAllocation: number;
  maxPlayers: number;
  startedAt?: string;
  createdAt: string;
  node: {
    nodeId: string;
    ipAddress: string;
  };
}

interface ServerStats {
  serverId: string;
  status: string;
  containerId?: string;
  created?: string;
  info?: any;
}

export const ServerManagement: React.FC = () => {
  const [servers, setServers] = useState<GameServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [serverStats, setServerStats] = useState<Record<string, ServerStats>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadServers();
    const interval = setInterval(loadServers, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getAuthToken = () => localStorage.getItem('satisfactory_auth_token');

  const loadServers = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      // TODO: Admin user listing endpoint not yet implemented in backend
      // For now, only show current user's servers
      const userResponse = await fetch(API_ENDPOINTS.user.me, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user information');
      }

      const currentUser = await userResponse.json();
      
      // Get servers for the current user only
      const serversResponse = await fetch(API_ENDPOINTS.servers.userServers(currentUser.id), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      let userServers: GameServer[] = [];
      if (serversResponse.ok) {
        userServers = await serversResponse.json();
      } else {
        console.warn('Failed to fetch user servers:', serversResponse.statusText);
      }

      setServers(userServers);

      // Load detailed stats for each server
      const stats: Record<string, ServerStats> = {};
      for (const server of userServers) {
        try {
          const statsResponse = await fetch(API_ENDPOINTS.servers.serverStatus(server.serverId), {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (statsResponse.ok) {
            stats[server.serverId] = await statsResponse.json();
          }
        } catch (err) {
          console.error(`Error fetching stats for ${server.serverId}:`, err);
        }
      }
      setServerStats(stats);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    try {
      setActionLoading(prev => ({ ...prev, [serverId]: true }));
      const token = getAuthToken();
      if (!token) return;

      let response;
      if (action === 'delete') {
        response = await fetch(API_ENDPOINTS.servers.deleteServer(serverId), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (action === 'start') {
        response = await fetch(API_ENDPOINTS.servers.startServer(serverId), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (action === 'stop') {
        response = await fetch(API_ENDPOINTS.servers.stopServer(serverId), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else if (action === 'restart') {
        response = await fetch(API_ENDPOINTS.servers.restartServer(serverId), {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      if (!response || !response.ok) {
        const errorData = response ? await response.json() : { error: 'No response received' };
        throw new Error(errorData.error || `Failed to ${action} server`);
      }

      // Refresh server list
      setTimeout(loadServers, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} server`);
    } finally {
      setActionLoading(prev => ({ ...prev, [serverId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'text-green-400 bg-green-400/20';
      case 'STOPPED': return 'text-gray-400 bg-gray-400/20';
      case 'STARTING': return 'text-yellow-400 bg-yellow-400/20';
      case 'STOPPING': return 'text-orange-400 bg-orange-400/20';
      case 'ERROR': return 'text-red-400 bg-red-400/20';
      case 'PROVISIONING': return 'text-blue-400 bg-blue-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="text-white text-center">Loading servers...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Server Management</h2>
            <p className="text-slate-400">Manage all Satisfactory servers across the platform</p>
          </div>
          <button
            onClick={() => setShowProvisionModal(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Provision Server
          </button>
        </div>
      </div>

      {/* Admin Notice */}
      <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-yellow-400">
            <strong>Admin Mode Limited:</strong> Currently showing your servers only. Global admin server listing not yet implemented in backend.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-xl p-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Servers Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-slate-300 font-medium">Server ID</th>
                <th className="text-left p-4 text-slate-300 font-medium">Name</th>
                <th className="text-left p-4 text-slate-300 font-medium">User</th>
                <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                <th className="text-left p-4 text-slate-300 font-medium">Resources</th>
                <th className="text-left p-4 text-slate-300 font-medium">Ports</th>
                <th className="text-left p-4 text-slate-300 font-medium">Node</th>
                <th className="text-left p-4 text-slate-300 font-medium">Created</th>
                <th className="text-left p-4 text-slate-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {servers.map((server) => {
                const stats = serverStats[server.serverId];
                const isLoading = actionLoading[server.serverId];
                
                return (
                  <tr key={server.serverId} className="hover:bg-slate-700/30">
                    <td className="p-4">
                      <div className="text-white font-mono text-sm">
                        {server.serverId}
                      </div>
                      {stats?.containerId && (
                        <div className="text-slate-400 text-xs">
                          Container: {stats.containerId.substring(0, 12)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium">{server.serverName}</div>
                      <div className="text-slate-400 text-sm">{server.maxPlayers} players max</div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300">{server.userId}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(server.status)}`}>
                        {server.status}
                      </span>
                      {stats?.status && stats.status !== server.status && (
                        <div className="text-xs text-slate-400 mt-1">
                          Container: {stats.status}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">
                        <div>{server.ramAllocation}GB RAM</div>
                        <div>{server.cpuAllocation} CPU cores</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">
                        <div>Game: {server.gamePort}</div>
                        <div>Beacon: {server.beaconPort}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">
                        <div>{server.node.nodeId}</div>
                        <div className="text-slate-400">{server.node.ipAddress}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">
                        {formatDate(server.createdAt)}
                      </div>
                      {server.startedAt && (
                        <div className="text-slate-400 text-xs">
                          Started: {formatDate(server.startedAt)}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex space-x-2">
                        {server.status === 'STOPPED' && (
                          <button
                            onClick={() => handleServerAction(server.serverId, 'start')}
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {(server.status === 'RUNNING' || server.status === 'STARTING') && (
                          <button
                            onClick={() => handleServerAction(server.serverId, 'stop')}
                            disabled={isLoading}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            Stop
                          </button>
                        )}
                        {server.status === 'RUNNING' && (
                          <button
                            onClick={() => handleServerAction(server.serverId, 'restart')}
                            disabled={isLoading}
                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            Restart
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete server ${server.serverId}? This will remove all data permanently.`)) {
                              handleServerAction(server.serverId, 'delete');
                            }
                          }}
                          disabled={isLoading}
                          className="bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                      {isLoading && (
                        <div className="text-xs text-slate-400 mt-1">Processing...</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {servers.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-400">
            No servers found. Click "Provision Server" to create one.
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Total Servers</div>
          <div className="text-2xl font-bold text-white">{servers.length}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Running</div>
          <div className="text-2xl font-bold text-green-400">
            {servers.filter(s => s.status === 'RUNNING').length}
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Stopped</div>
          <div className="text-2xl font-bold text-gray-400">
            {servers.filter(s => s.status === 'STOPPED').length}
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Error</div>
          <div className="text-2xl font-bold text-red-400">
            {servers.filter(s => s.status === 'ERROR').length}
          </div>
        </div>
      </div>

      {/* Provision Modal */}
      {showProvisionModal && (
        <ProvisionServerModal
          onClose={() => setShowProvisionModal(false)}
          onSuccess={() => {
            setShowProvisionModal(false);
            loadServers();
          }}
        />
      )}
    </div>
  );
};
