import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface TunnelInstance {
  server_id: string;
  created_at: string;
  game_port: number;
  query_port: number;
  rathole_port: number;
  tunnel_game_port: number;
  tunnel_query_port: number;
  is_running: boolean;
  pid?: number;
  owner_id: number;
  owner_username: string;
  config_dir: string;
}

interface TunnelInstances {
  [serverId: string]: TunnelInstance;
}

export const TunnelManagement: React.FC = () => {
  const [instances, setInstances] = useState<TunnelInstances>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTunnels();
    const interval = setInterval(loadTunnels, 10000);
    return () => clearInterval(interval);
  }, []);

  const getAuthToken = () => localStorage.getItem('satisfactory_auth_token');

  const loadTunnels = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.rathole.adminInstances, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setInstances(data.instances || {});
      } else {
        throw new Error('Failed to fetch tunnel instances');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tunnels');
    } finally {
      setLoading(false);
    }
  };

  const handleTunnelAction = async (serverId: string, action: 'start' | 'stop' | 'delete') => {
    try {
      setActionLoading(prev => ({ ...prev, [serverId]: true }));
      const token = getAuthToken();
      if (!token) return;

      let response;
      if (action === 'delete') {
        response = await fetch(API_ENDPOINTS.rathole.adminDeleteInstance(serverId), {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        // Note: start/stop actions for tunnels would need to be implemented in rathole manager
        throw new Error(`Action '${action}' not yet implemented for tunnels`);
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${action} tunnel`);
      }

      setTimeout(loadTunnels, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} tunnel`);
    } finally {
      setActionLoading(prev => ({ ...prev, [serverId]: false }));
    }
  };

  const getClientConfig = async (serverId: string) => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.rathole.getClientConfig(serverId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Create a downloadable file
        const blob = new Blob([data.config], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${serverId}-client.toml`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get client config');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="text-white text-center">Loading tunnel instances...</div>
      </div>
    );
  }

  const instancesArray = Object.values(instances);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-white mb-2">Tunnel Management</h2>
        <p className="text-slate-400">Manage Rathole tunnel instances for server connectivity</p>
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

      {/* Tunnel Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Total Tunnels</div>
          <div className="text-2xl font-bold text-white">{instancesArray.length}</div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Running</div>
          <div className="text-2xl font-bold text-green-400">
            {instancesArray.filter(i => i.is_running).length}
          </div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm">Stopped</div>
          <div className="text-2xl font-bold text-gray-400">
            {instancesArray.filter(i => !i.is_running).length}
          </div>
        </div>
      </div>

      {/* Tunnels Table */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left p-4 text-slate-300 font-medium">Server ID</th>
                <th className="text-left p-4 text-slate-300 font-medium">Owner</th>
                <th className="text-left p-4 text-slate-300 font-medium">Status</th>
                <th className="text-left p-4 text-slate-300 font-medium">Ports</th>
                <th className="text-left p-4 text-slate-300 font-medium">Tunnel Ports</th>
                <th className="text-left p-4 text-slate-300 font-medium">Created</th>
                <th className="text-left p-4 text-slate-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {instancesArray.map((instance) => {
                const isLoading = actionLoading[instance.server_id];
                
                return (
                  <tr key={instance.server_id} className="hover:bg-slate-700/30">
                    <td className="p-4">
                      <div className="text-white font-mono text-sm">{instance.server_id}</div>
                      {instance.pid && (
                        <div className="text-slate-400 text-xs">PID: {instance.pid}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300">{instance.owner_username}</div>
                      <div className="text-slate-400 text-xs">ID: {instance.owner_id}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        instance.is_running 
                          ? 'text-green-400 bg-green-400/20' 
                          : 'text-gray-400 bg-gray-400/20'
                      }`}>
                        {instance.is_running ? 'Running' : 'Stopped'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">
                        <div>Game: {instance.game_port}</div>
                        <div>Query: {instance.query_port}</div>
                        <div className="text-slate-400 text-xs">Control: {instance.rathole_port}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-cyan-300 text-sm font-medium">
                        <div>Game: {instance.tunnel_game_port}</div>
                        <div>Query: {instance.tunnel_query_port}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">
                        {formatDate(instance.created_at)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {!instance.is_running && (
                          <button
                            onClick={() => handleTunnelAction(instance.server_id, 'start')}
                            disabled={isLoading}
                            className="bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            Start
                          </button>
                        )}
                        {instance.is_running && (
                          <button
                            onClick={() => handleTunnelAction(instance.server_id, 'stop')}
                            disabled={isLoading}
                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white px-2 py-1 rounded text-xs transition-colors"
                          >
                            Stop
                          </button>
                        )}
                        <button
                          onClick={() => getClientConfig(instance.server_id)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          Config
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete tunnel for ${instance.server_id}?`)) {
                              handleTunnelAction(instance.server_id, 'delete');
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

        {instancesArray.length === 0 && !loading && (
          <div className="text-center py-8 text-slate-400">
            No tunnel instances found.
          </div>
        )}
      </div>
    </div>
  );
};
