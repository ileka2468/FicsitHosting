import { 
  UserServer, 
  ServerConfig,
  Player 
} from '../types';
import { API_ENDPOINTS, ORCHESTRATOR_BASE_URL } from '../config/api';

// API Configuration
const API_BASE_URL = ORCHESTRATOR_BASE_URL;
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://orchestrator:8080/ws';

// API Types matching Spring Boot DTOs
export interface ProvisionServerRequest {
  serverName: string;
  ram: number;
  cpu: number;
  maxPlayers: number;
  storage: number;
  backupFrequency: string;
  serverLocation: string;
}

export interface ProvisionServerResponse {
  serverId: string;
  serverName: string;
  status: string;
  gamePort: number;
  queryPort: number;
  nodeId: string;
  message: string;
}

export interface GameServerDto {
  id: string;
  serverName: string;
  status: string;
  userId: string;
  nodeId: string;
  gamePort: number;
  queryPort: number;
  containerId?: string;
  ram: number;
  cpu: number;
  maxPlayers: number;
  storage: number;
  backupFrequency: string;
  serverLocation: string;
  createdAt: string;
  lastOnline?: string;
}

export interface NodeDto {
  id: string;
  hostname: string;
  ipAddress: string;
  port: number;
  status: string;
  cpuCores: number;
  ramGb: number;
  availableRam: number;
  location: string;
  lastHeartbeat?: string;
}

export interface ServerStatsDto {
  serverId: string;
  cpuUsage: number;
  memoryUsage: number;
  networkIn: number;
  networkOut: number;
  players: Player[];
  uptime: string;
  tps: number;
  timestamp: string;
}

// Authentication token management
class TokenManager {
  private static readonly TOKEN_KEY = 'satisfactory_auth_token';
  private static readonly REFRESH_TOKEN_KEY = 'satisfactory_refresh_token';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token: string): void {
    localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
  }

  static clearTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}

// HTTP Client with authentication and error handling
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const token = TokenManager.getToken();
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (response.status === 401) {
      // Token expired, try to refresh
      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();
            TokenManager.setToken(accessToken);
            TokenManager.setRefreshToken(newRefreshToken);
            
            // Retry original request with new token
            config.headers = {
              ...config.headers,
              Authorization: `Bearer ${accessToken}`,
            };
            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, config);
            if (!retryResponse.ok) {
              throw new ApiError(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`, retryResponse.status);
            }
            return retryResponse.json();
          }
        } catch (refreshError) {
          TokenManager.clearTokens();
          throw new ApiError('Authentication failed', 401);
        }
      }
      
      TokenManager.clearTokens();
      throw new ApiError('Authentication required', 401);
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new ApiError(
        `HTTP ${response.status}: ${errorBody || response.statusText}`,
        response.status
      );
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Custom error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Initialize API client
const apiClient = new ApiClient(API_BASE_URL);

// Authentication API
export const authApi = {
  async login(username: string, password: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    const response = await fetch(API_ENDPOINTS.auth.signin, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usernameOrEmail: username,
        password,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
      } catch (e) {
        errorMessage = `Server error: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const authResponse = await response.json();
    
    TokenManager.setToken(authResponse.accessToken);
    TokenManager.setRefreshToken(authResponse.refreshToken);
    
    return authResponse;
  },

  async register(username: string, email: string, password: string): Promise<{ message: string }> {
    const response = await fetch(API_ENDPOINTS.auth.signup, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Registration failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
      } catch (e) {
        errorMessage = `Server error: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Registration now returns a message, not tokens
    return response.json();
  },

  async logout(): Promise<void> {
    const refreshToken = TokenManager.getRefreshToken();
    if (refreshToken) {
      try {
        await fetch(API_ENDPOINTS.auth.logout, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TokenManager.getToken()}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
    }
    
    TokenManager.clearTokens();
  },

  async getCurrentUser(): Promise<any> {
    const token = TokenManager.getToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get current user: ${response.status}`);
    }

    return response.json();
  },

  async verifyEmail(token: string): Promise<{ message: string } | { accessToken: string; refreshToken: string; user: any }> {
    const response = await fetch(`${API_ENDPOINTS.auth.verifyEmail}?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Email verification failed';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
      } catch (e) {
        errorMessage = `Server error: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // If the response contains tokens, store them
    if (result.accessToken && result.refreshToken) {
      TokenManager.setToken(result.accessToken);
      TokenManager.setRefreshToken(result.refreshToken);
    }

    return result;
  },

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const response = await fetch(`${API_ENDPOINTS.auth.resendVerification}?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to resend verification email';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
      } catch (e) {
        errorMessage = `Server error: ${response.status} - ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  },

  isAuthenticated(): boolean {
    const token = TokenManager.getToken();
    return token !== null && !TokenManager.isTokenExpired(token);
  },
};

// Server management API
export const serverApi = {
  async getServers(): Promise<UserServer[]> {
    const servers = await apiClient.get<GameServerDto[]>('/servers');
    return servers.map(this.mapGameServerToUserServer);
  },

  async getServer(serverId: string): Promise<UserServer> {
    const server = await apiClient.get<GameServerDto>(`/servers/${serverId}`);
    return this.mapGameServerToUserServer(server);
  },

  async createServer(request: ProvisionServerRequest): Promise<ProvisionServerResponse> {
    return apiClient.post<ProvisionServerResponse>('/servers', request);
  },

  async startServer(serverId: string): Promise<void> {
    await apiClient.post(`/servers/${serverId}/start`);
  },

  async stopServer(serverId: string): Promise<void> {
    await apiClient.post(`/servers/${serverId}/stop`);
  },

  async restartServer(serverId: string): Promise<void> {
    await apiClient.post(`/servers/${serverId}/restart`);
  },

  async deleteServer(serverId: string): Promise<void> {
    await apiClient.delete(`/servers/${serverId}`);
  },

  async updateServerConfig(serverId: string, config: Partial<ServerConfig>): Promise<void> {
    await apiClient.put(`/servers/${serverId}/config`, config);
  },

  async getServerStats(serverId: string): Promise<ServerStatsDto> {
    return apiClient.get<ServerStatsDto>(`/servers/${serverId}/stats`);
  },

  async getServerLogs(serverId: string, lines: number = 100): Promise<string[]> {
    const response = await apiClient.get<{ logs: string[] }>(`/servers/${serverId}/logs?lines=${lines}`);
    return response.logs;
  },

  // Helper method to map DTO to frontend type
  mapGameServerToUserServer(server: GameServerDto): UserServer {
    return {
      id: server.id,
      name: server.serverName,
      status: server.status as UserServer['status'],
      config: {
        ram: server.ram,
        cpu: server.cpu,
        serverSize: 'standard', // Default value, should be determined from RAM/CPU specs
        maxPlayers: server.maxPlayers,
        storage: server.storage,
        backupFrequency: server.backupFrequency as ServerConfig['backupFrequency'],
        serverLocation: server.serverLocation as ServerConfig['serverLocation'],
      },
      createdAt: server.createdAt,
      lastOnline: server.lastOnline,
      gamePort: server.gamePort,
      queryPort: server.queryPort,
      players: {
        current: 0, // Will be populated by real-time updates
        max: server.maxPlayers,
        list: [],
      },
      performance: {
        uptime: '0m',
        tps: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
      saves: [], // Will be populated separately
      settings: {
        serverName: server.serverName,
        description: '',
        gameMode: 'survival',
        difficulty: 'normal',
        pvp: false,
        whitelist: false,
        maxPlayers: server.maxPlayers,
        motd: '',
        autoSave: true,
        backupEnabled: true,
        mods: [],
      },
    };
  },
};

// Node management API (for admin users)
export const nodeApi = {
  async getNodes(): Promise<NodeDto[]> {
    return apiClient.get<NodeDto[]>('/nodes');
  },

  async getNode(nodeId: string): Promise<NodeDto> {
    return apiClient.get<NodeDto>(`/nodes/${nodeId}`);
  },

  async registerNode(hostname: string, ipAddress: string, port: number, location: string): Promise<NodeDto> {
    return apiClient.post<NodeDto>('/nodes', {
      hostname,
      ipAddress,
      port,
      location,
    });
  },

  async updateNode(nodeId: string, updates: Partial<NodeDto>): Promise<NodeDto> {
    return apiClient.put<NodeDto>(`/nodes/${nodeId}`, updates);
  },

  async deleteNode(nodeId: string): Promise<void> {
    await apiClient.delete(`/nodes/${nodeId}`);
  },
};

// WebSocket manager for real-time updates
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const token = TokenManager.getToken();
    if (!token) {
      console.warn('No auth token available for WebSocket connection');
      return;
    }

    try {
      this.ws = new WebSocket(`${WS_BASE_URL}?token=${token}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.notifySubscribers(message.type, message.data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    this.subscribers.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(eventType);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  private notifySubscribers(eventType: string, data: any): void {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket subscriber:', error);
        }
      });
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    setTimeout(() => {
      console.log(`WebSocket reconnection attempt ${this.reconnectAttempts}`);
      this.connect();
    }, delay);
  }
}

// Global WebSocket manager instance
export const wsManager = new WebSocketManager();

// Note: WebSocket connection is initialized manually when needed
// if (authApi.isAuthenticated()) {
//   wsManager.connect();
// }
