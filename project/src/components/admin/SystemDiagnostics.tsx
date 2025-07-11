import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface SystemHealth {
  orchestrator: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime: number;
    version: string;
    lastCheck: string;
    metrics: {
      requestsPerMinute: number;
      avgResponseTime: number;
      errorRate: number;
    };
  };
  database: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    connectionPool: {
      active: number;
      idle: number;
      max: number;
    };
    queryPerformance: {
      avgQueryTime: number;
      slowQueries: number;
    };
  };
  rathole: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    tunnelsActive: number;
    tunnelsTotal: number;
    version: string;
  };
  hostAgents: {
    total: number;
    online: number;
    offline: number;
    avgResponseTime: number;
  };
}

interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  service: string;
  message: string;
  details?: any;
}

export const SystemDiagnostics: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [logLevel, setLogLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showSystemInfo, setShowSystemInfo] = useState(false);

  useEffect(() => {
    fetchSystemHealth();
    fetchLogs();
    
    const interval = autoRefresh ? setInterval(() => {
      fetchSystemHealth();
      fetchLogs();
    }, 30000) : null; // Refresh every 30 seconds
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchSystemHealth = async () => {
    try {
      // Note: System health endpoints not implemented yet
      // This would need to be added to the orchestrator or a dedicated monitoring service
      setError("System health monitoring not yet implemented");
      
      // Mock data for UI demonstration
      const mockHealth: SystemHealth = {
        orchestrator: {
          status: 'healthy',
          uptime: 86400,
          version: '1.0.0',
          lastCheck: new Date().toISOString(),
          metrics: {
            requestsPerMinute: 42,
            avgResponseTime: 156,
            errorRate: 0.1
          }
        },
        database: {
          status: 'healthy',
          connectionPool: {
            active: 5,
            idle: 3,
            max: 20
          },
          queryPerformance: {
            avgQueryTime: 12,
            slowQueries: 0
          }
        },
        rathole: {
          status: 'healthy',
          tunnelsActive: 3,
          tunnelsTotal: 5,
          version: '0.5.0'
        },
        hostAgents: {
          total: 1,
          online: 1,
          offline: 0,
          avgResponseTime: 89
        }
      };
      setHealth(mockHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system health');
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      // Note: Centralized logging not implemented yet
      // This would need to be added to the orchestrator or a dedicated logging service
      setError("Centralized logging not yet implemented");
      
      // Mock logs for UI demonstration
      const mockLogs: LogEntry[] = [
        {
          timestamp: new Date().toISOString(),
          level: 'INFO',
          service: 'orchestrator',
          message: 'Server provision request received',
          details: { userId: '17', serverId: 'test-123' }
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'WARN',
          service: 'host-agent',
          message: 'High memory usage detected',
          details: { usage: '85%' }
        }
      ];
      setLogs(mockLogs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const runHealthCheck = async () => {
    try {
      // Note: Health check endpoint not implemented yet
      setError("Health check endpoint not yet implemented");
      await fetchSystemHealth(); // Just refresh mock data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run health check');
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      return;
    }

    try {
      // Note: Log clearing not implemented yet
      setError("Log clearing not yet implemented");
      setLogs([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear logs');
    }
  };

  const exportLogs = async () => {
    try {
      // Note: Log export not implemented yet
      setError("Log export not yet implemented");
      
      // Mock export for UI demonstration
      const data = JSON.stringify(logs, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export logs');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'unhealthy': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-900/50 text-green-200';
      case 'degraded': return 'bg-yellow-900/50 text-yellow-200';
      case 'unhealthy': return 'bg-red-900/50 text-red-200';
      default: return 'bg-gray-900/50 text-gray-200';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-cyan-400';
      case 'DEBUG': return 'text-gray-400';
      default: return 'text-white';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">System Diagnostics</h2>
            <p className="text-slate-400">Monitor system health and view logs</p>
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
              onClick={runHealthCheck}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Run Health Check
            </button>
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

      {/* System Health Overview */}
      {health && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Orchestrator */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Orchestrator</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(health.orchestrator.status)}`}>
                {health.orchestrator.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="text-white">{formatUptime(health.orchestrator.uptime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="text-white">{health.orchestrator.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Requests/min:</span>
                <span className="text-white">{health.orchestrator.metrics.requestsPerMinute}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Response:</span>
                <span className="text-white">{health.orchestrator.metrics.avgResponseTime}ms</span>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Database</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(health.database.status)}`}>
                {health.database.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Connections:</span>
                <span className="text-white">
                  {health.database.connectionPool.active}/{health.database.connectionPool.max}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Query:</span>
                <span className="text-white">{health.database.queryPerformance.avgQueryTime}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slow Queries:</span>
                <span className="text-white">{health.database.queryPerformance.slowQueries}</span>
              </div>
            </div>
          </div>

          {/* FRP */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">FRP</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(health.rathole.status)}`}>
                {health.rathole.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Active Tunnels:</span>
                <span className="text-white">
                  {health.rathole.tunnelsActive}/{health.rathole.tunnelsTotal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Version:</span>
                <span className="text-white">{health.rathole.version}</span>
              </div>
            </div>
          </div>

          {/* Host Agents */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Host Agents</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                health.hostAgents.online === health.hostAgents.total ? 'bg-green-900/50 text-green-200' :
                health.hostAgents.online > 0 ? 'bg-yellow-900/50 text-yellow-200' :
                'bg-red-900/50 text-red-200'
              }`}>
                {health.hostAgents.online}/{health.hostAgents.total}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Online:</span>
                <span className="text-white">{health.hostAgents.online}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Offline:</span>
                <span className="text-white">{health.hostAgents.offline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Response:</span>
                <span className="text-white">{health.hostAgents.avgResponseTime}ms</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Information */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
        <button
          onClick={() => setShowSystemInfo(!showSystemInfo)}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <h3 className="text-lg font-semibold text-white">System Information</h3>
          <span className="text-slate-400">
            {showSystemInfo ? '↑' : '↓'}
          </span>
        </button>
        
        {showSystemInfo && (
          <div className="px-6 pb-6 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              <div>
                <h4 className="font-medium text-white mb-2">Environment</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mode:</span>
                    <span className="text-white">Production</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Build:</span>
                    <span className="text-white">v1.0.0-beta</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Started:</span>
                    <span className="text-white">{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Configuration</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">JWT Expiry:</span>
                    <span className="text-white">24h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Max Servers:</span>
                    <span className="text-white">100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Port Range:</span>
                    <span className="text-white">15000-16000</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-white mb-2">Resources</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Memory:</span>
                    <span className="text-white">2.1GB / 4GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CPU:</span>
                    <span className="text-white">45% / 4 cores</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Disk:</span>
                    <span className="text-white">15GB / 100GB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Logs Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-white">System Logs</h3>
            <div className="flex space-x-2">
              <button
                onClick={exportLogs}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Export
              </button>
              <button
                onClick={clearLogs}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Log Filters */}
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Services</option>
              <option value="orchestrator">Orchestrator</option>
              <option value="host-agent">Host Agent</option>
              <option value="rathole">FRP</option>
              <option value="auth">Auth Service</option>
            </select>
            <select
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">All Levels</option>
              <option value="ERROR">Error</option>
              <option value="WARN">Warning</option>
              <option value="INFO">Info</option>
              <option value="DEBUG">Debug</option>
            </select>
          </div>
        </div>

        {/* Log Entries */}
        <div className="max-h-96 overflow-y-auto">
          {loading && logs.length === 0 ? (
            <div className="p-6 text-center text-slate-400">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="p-6 text-center text-slate-400">No logs found</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="px-6 py-3 hover:bg-slate-700/30 border-b border-slate-700/50 last:border-b-0">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 text-xs text-slate-400 w-20">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div className={`flex-shrink-0 text-xs font-medium w-12 ${getLogLevelColor(log.level)}`}>
                      {log.level}
                    </div>
                    <div className="flex-shrink-0 text-xs text-slate-400 w-20">
                      {log.service}
                    </div>
                    <div className="flex-1 text-sm text-white">
                      {log.message}
                      {log.details && (
                        <div className="mt-1 text-xs text-slate-400 font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
