import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface NodeInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  status: 'online' | 'offline' | 'degraded';
  lastSeen: string;
  version: string;
  resources: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkRx: number;
    networkTx: number;
  };
  containers: {
    total: number;
    running: number;
    stopped: number;
  };
  uptime: number;
}

export const NodeMonitoring: React.FC = () => {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchNodes();
    
    const interval = autoRefresh ? setInterval(fetchNodes, 30000) : null; // Refresh every 30 seconds
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('satisfactory_auth_token');
      const response = await fetch(API_ENDPOINTS.nodes.list, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch node information');
      }

      const nodeData = await response.json();
      setNodes(nodeData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nodes');
    } finally {
      setLoading(false);
    }
  };

  const restartNode = async (nodeId: string) => {
    if (!confirm('Are you sure you want to restart this node? This will stop all running containers.')) {
      return;
    }

    try {
      const token = localStorage.getItem('satisfactory_auth_token');
      // Note: Restart node functionality not implemented in current orchestrator
      // This would need to be added as an admin endpoint
      setError("Node restart functionality not yet implemented");
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restart node');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'offline': return 'text-red-400';
      case 'degraded': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-900/50 text-green-200';
      case 'offline': return 'bg-red-900/50 text-red-200';
      case 'degraded': return 'bg-yellow-900/50 text-yellow-200';
      default: return 'bg-gray-900/50 text-gray-200';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (loading && nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading node information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Node Monitoring</h2>
            <p className="text-slate-400">Monitor and manage infrastructure nodes</p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center text-white">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchNodes}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {nodes.filter(n => n.status === 'online').length}
            </div>
            <div className="text-slate-400">Online Nodes</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {nodes.reduce((acc, n) => acc + n.containers.running, 0)}
            </div>
            <div className="text-slate-400">Running Containers</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {(nodes.reduce((acc, n) => acc + n.resources.cpuUsage, 0) / nodes.length || 0).toFixed(1)}%
            </div>
            <div className="text-slate-400">Avg CPU Usage</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">
              {(nodes.reduce((acc, n) => acc + n.resources.memoryUsage, 0) / nodes.length || 0).toFixed(1)}%
            </div>
            <div className="text-slate-400">Avg Memory Usage</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-300 hover:text-red-100 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6 cursor-pointer transition-all ${
              selectedNode === node.id ? 'ring-2 ring-cyan-500' : 'hover:border-slate-600'
            }`}
            onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
          >
            {/* Node Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{node.name}</h3>
                <p className="text-slate-400 text-sm">{node.host}:{node.port}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(node.status)}`}>
                {node.status.toUpperCase()}
              </span>
            </div>

            {/* Resource Usage */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">CPU</span>
                  <span className="text-white">{node.resources.cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(node.resources.cpuUsage, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Memory</span>
                  <span className="text-white">{node.resources.memoryUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(node.resources.memoryUsage, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Disk</span>
                  <span className="text-white">{node.resources.diskUsage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(node.resources.diskUsage, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Container Stats */}
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm">
                <span className="text-slate-400">Containers: </span>
                <span className="text-green-400">{node.containers.running}</span>
                <span className="text-slate-400">/</span>
                <span className="text-white">{node.containers.total}</span>
              </div>
              <div className="text-sm text-slate-400">
                Uptime: {formatUptime(node.uptime)}
              </div>
            </div>

            {/* Expanded Details */}
            {selectedNode === node.id && (
              <div className="border-t border-slate-700 pt-4 mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Version:</span>
                    <div className="text-white">{node.version}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Last Seen:</span>
                    <div className="text-white">
                      {new Date(node.lastSeen).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Network RX:</span>
                    <div className="text-white">{formatBytes(node.resources.networkRx)}/s</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Network TX:</span>
                    <div className="text-white">{formatBytes(node.resources.networkTx)}/s</div>
                  </div>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      restartNode(node.id);
                    }}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    Restart Node
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to node logs or detailed view
                    }}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-2 px-4 rounded-lg text-sm transition-colors"
                  >
                    View Logs
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {nodes.length === 0 && !loading && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-8 text-center">
          <div className="text-slate-400 text-lg">No nodes available</div>
          <p className="text-slate-500 mt-2">
            Host agents will appear here once they connect to the system.
          </p>
        </div>
      )}
    </div>
  );
};
