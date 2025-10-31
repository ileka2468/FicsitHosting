import { useState, useEffect, useCallback } from 'react';
import { UserServer, ServerConfig } from '../types';
import { serverApi, wsManager, ApiError, ProvisionServerRequest } from './api';

interface UseServersResult {
  servers: UserServer[];
  loading: boolean;
  error: string | null;
  refreshServers: () => Promise<void>;
  createServer: (request: ProvisionServerRequest) => Promise<void>;
  startServer: (serverId: string) => Promise<void>;
  stopServer: (serverId: string) => Promise<void>;
  restartServer: (serverId: string) => Promise<void>;
  deleteServer: (serverId: string) => Promise<void>;
  updateServerConfig: (serverId: string, config: Partial<ServerConfig>) => Promise<void>;
}

export const useServers = (): UseServersResult => {
  const [servers, setServers] = useState<UserServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedServers = await serverApi.getServers();
      setServers(fetchedServers);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch servers';
      setError(errorMessage);
      console.error('Failed to fetch servers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createServer = useCallback(async (request: ProvisionServerRequest) => {
    try {
      setError(null);
      await serverApi.createServer(request);
      await refreshServers(); // Refresh the list after creation
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create server';
      setError(errorMessage);
      throw err;
    }
  }, [refreshServers]);

  const startServer = useCallback(async (serverId: string) => {
    try {
      setError(null);
      await serverApi.startServer(serverId);
      // Update server status optimistically
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: 'starting' as const }
          : server
      ));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to start server';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const stopServer = useCallback(async (serverId: string) => {
    try {
      setError(null);
      await serverApi.stopServer(serverId);
      // Update server status optimistically
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: 'stopping' as const }
          : server
      ));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to stop server';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const restartServer = useCallback(async (serverId: string) => {
    try {
      setError(null);
      await serverApi.restartServer(serverId);
      // Update server status optimistically
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, status: 'restarting' as const }
          : server
      ));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to restart server';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const deleteServer = useCallback(async (serverId: string) => {
    try {
      setError(null);
      await serverApi.deleteServer(serverId);
      // Remove server from list optimistically
      setServers(prev => prev.filter(server => server.id !== serverId));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete server';
      setError(errorMessage);
      throw err;
    }
  }, []);

  const updateServerConfig = useCallback(async (serverId: string, config: Partial<ServerConfig>) => {
    try {
      setError(null);
      await serverApi.updateServerConfig(serverId, config);
      // Update server config optimistically
      setServers(prev => prev.map(server => 
        server.id === serverId 
          ? { ...server, config: { ...server.config, ...config } }
          : server
      ));
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update server config';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Set up WebSocket subscriptions for real-time updates
  useEffect(() => {
    const unsubscribeServerStatus = wsManager.subscribe('server_status', (data: any) => {
      setServers(prev => prev.map(server => 
        server.id === data.serverId 
          ? { ...server, status: data.status }
          : server
      ));
    });

    const unsubscribeServerStats = wsManager.subscribe('server_stats', (data: any) => {
      setServers(prev => prev.map(server => 
        server.id === data.serverId 
          ? {
              ...server,
              performance: {
                uptime: data.uptime,
                tps: data.tps,
                memoryUsage: data.memoryUsage,
                cpuUsage: data.cpuUsage,
              },
              players: {
                ...server.players,
                current: data.players.length,
                list: data.players,
              },
            }
          : server
      ));
    });

    const unsubscribeServerCreated = wsManager.subscribe('server_created', (data: any) => {
      const newServer = serverApi.mapGameServerToUserServer(data);
      setServers(prev => [...prev, newServer]);
    });

    const unsubscribeServerDeleted = wsManager.subscribe('server_deleted', (data: any) => {
      setServers(prev => prev.filter(server => server.id !== data.serverId));
    });

    // Initial fetch
    refreshServers();

    // Cleanup subscriptions
    return () => {
      unsubscribeServerStatus();
      unsubscribeServerStats();
      unsubscribeServerCreated();
      unsubscribeServerDeleted();
    };
  }, [refreshServers]);

  return {
    servers,
    loading,
    error,
    refreshServers,
    createServer,
    startServer,
    stopServer,
    restartServer,
    deleteServer,
    updateServerConfig,
  };
};

interface UseServerResult {
  server: UserServer | null;
  loading: boolean;
  error: string | null;
  refreshServer: () => Promise<void>;
  stats: any | null;
  logs: string[];
  refreshStats: () => Promise<void>;
  refreshLogs: () => Promise<void>;
}

export const useServer = (serverId: string | null): UseServerResult => {
  const [server, setServer] = useState<UserServer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const refreshServer = useCallback(async () => {
    if (!serverId) {
      setServer(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const fetchedServer = await serverApi.getServer(serverId);
      setServer(fetchedServer);
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch server';
      setError(errorMessage);
      console.error('Failed to fetch server:', err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  const refreshStats = useCallback(async () => {
    if (!serverId) return;

    try {
      const serverStats = await serverApi.getServerStats(serverId);
      setStats(serverStats);
    } catch (err) {
      console.error('Failed to fetch server stats:', err);
    }
  }, [serverId]);

  const refreshLogs = useCallback(async () => {
    if (!serverId) return;

    try {
      const serverLogs = await serverApi.getServerLogs(serverId);
      setLogs(serverLogs);
    } catch (err) {
      console.error('Failed to fetch server logs:', err);
    }
  }, [serverId]);

  // Set up WebSocket subscriptions for real-time updates
  useEffect(() => {
    if (!serverId) return;

    const unsubscribeServerStatus = wsManager.subscribe('server_status', (data: any) => {
      if (data.serverId === serverId) {
        setServer(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    const unsubscribeServerStats = wsManager.subscribe('server_stats', (data: any) => {
      if (data.serverId === serverId) {
        setStats(data);
        setServer(prev => prev ? {
          ...prev,
          performance: {
            uptime: data.uptime,
            tps: data.tps,
            memoryUsage: data.memoryUsage,
            cpuUsage: data.cpuUsage,
          },
          players: {
            ...prev.players,
            current: data.players.length,
            list: data.players,
          },
        } : null);
      }
    });

    const unsubscribeServerLogs = wsManager.subscribe('server_logs', (data: any) => {
      if (data.serverId === serverId) {
        setLogs(data.logs);
      }
    });

    // Initial fetch
    refreshServer();
    refreshStats();
    refreshLogs();

    // Cleanup subscriptions
    return () => {
      unsubscribeServerStatus();
      unsubscribeServerStats();
      unsubscribeServerLogs();
    };
  }, [serverId, refreshServer, refreshStats, refreshLogs]);

  return {
    server,
    loading,
    error,
    refreshServer,
    stats,
    logs,
    refreshStats,
    refreshLogs,
  };
};
