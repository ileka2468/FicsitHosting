// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'http://localhost:8080';
const RATHOLE_MANAGER_URL = import.meta.env.VITE_RATHOLE_MANAGER_URL || 'http://localhost:7001';
const HOST_AGENT_URL = import.meta.env.VITE_HOST_AGENT_URL || 'http://localhost:8082';

export const API_ENDPOINTS = {
  // Auth Service (port 8081)
  auth: {
    signin: `${API_BASE_URL}/api/auth/signin`,
    login: `${API_BASE_URL}/api/auth/login`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    register: `${API_BASE_URL}/api/auth/register`,
    refresh: `${API_BASE_URL}/api/auth/refresh`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    validate: `${API_BASE_URL}/api/auth/validate`,
    health: `${API_BASE_URL}/api/auth/health`,
    verifyEmail: `${API_BASE_URL}/api/auth/verify-email`,
    resendVerification: `${API_BASE_URL}/api/auth/resend-verification`,
    forgotPassword: `${API_BASE_URL}/api/auth/forgot-password`,
    resetPassword: `${API_BASE_URL}/api/auth/reset-password`,
    me: `${API_BASE_URL}/api/auth/me`,
  },
  
  // User endpoints (auth service)
  user: {
    me: `${API_BASE_URL}/api/user/me`,
    changePassword: `${API_BASE_URL}/api/user/change-password`,
    updateProfile: `${API_BASE_URL}/api/user/profile`,
  },
  
  // Server management (Orchestrator - port 8080)
  servers: {
    provision: `${ORCHESTRATOR_URL}/api/servers/provision`,
    userServers: (userId: string) => `${ORCHESTRATOR_URL}/api/servers/user/${userId}`,
    getServer: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}`,
    startServer: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}/start`,
    stopServer: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}/stop`,
    restartServer: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}/restart`,
    deleteServer: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}`,
    serverStatus: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}/status`,
    serverConfig: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}/config`,
    serverDataInfo: (serverId: string) => `${ORCHESTRATOR_URL}/api/servers/${serverId}/data-info`,
    userDataSummary: (userId: string) => `${ORCHESTRATOR_URL}/api/servers/user/${userId}/data-summary`,
  },
  
  // Node management (Orchestrator - port 8080)
  nodes: {
    list: `${ORCHESTRATOR_URL}/api/nodes`,
    register: `${ORCHESTRATOR_URL}/api/nodes/register`,
    updateStats: (nodeId: string) => `${ORCHESTRATOR_URL}/api/nodes/${nodeId}/stats`,
    markOffline: (nodeId: string) => `${ORCHESTRATOR_URL}/api/nodes/${nodeId}/offline`,
  },
  
  // Rathole tunnel management (Rathole Manager - port 7001)
  rathole: {
    health: `${RATHOLE_MANAGER_URL}/health`,
    instances: `${RATHOLE_MANAGER_URL}/api/instances`,
    createInstance: `${RATHOLE_MANAGER_URL}/api/instances`,
    deleteInstance: (serverId: string) => `${RATHOLE_MANAGER_URL}/api/instances/${serverId}`,
    getInstance: (serverId: string) => `${RATHOLE_MANAGER_URL}/api/instances/${serverId}`,
    getClientConfig: (serverId: string) => `${RATHOLE_MANAGER_URL}/api/instances/${serverId}/client-config`,
    // Admin endpoints
    adminInstances: `${RATHOLE_MANAGER_URL}/api/admin/instances`,
    adminDeleteInstance: (serverId: string) => `${RATHOLE_MANAGER_URL}/api/admin/instances/${serverId}`,
  },
  
  // Host Agent endpoints (port 8082) - for direct container management
  hostAgent: {
    spawnContainer: `${HOST_AGENT_URL}/api/containers/spawn`,
    stopContainer: `${HOST_AGENT_URL}/api/containers/stop`,
    startContainer: `${HOST_AGENT_URL}/api/containers/start`,
    restartContainer: `${HOST_AGENT_URL}/api/containers/restart`,
    deleteContainer: (serverId: string) => `${HOST_AGENT_URL}/api/containers/${serverId}/delete`,
    containerStatus: (serverId: string) => `${HOST_AGENT_URL}/api/containers/${serverId}/status`,
    containerConfig: (serverId: string) => `${HOST_AGENT_URL}/api/containers/${serverId}/config`,
    containerDataInfo: (serverId: string) => `${HOST_AGENT_URL}/api/containers/${serverId}/data-info`,
    dataSummary: `${HOST_AGENT_URL}/api/containers/data-summary`,
    stats: `${HOST_AGENT_URL}/api/stats`,
    health: `${HOST_AGENT_URL}/api/health`,
    threadsHealth: `${HOST_AGENT_URL}/api/health/threads`,
    restartThreads: `${HOST_AGENT_URL}/api/health/threads/restart`,
    // Rathole client management
    ratholeClients: `${HOST_AGENT_URL}/api/rathole/clients`,
    startRatholeClient: (serverId: string) => `${HOST_AGENT_URL}/api/rathole/clients/${serverId}/start`,
    stopRatholeClient: (serverId: string) => `${HOST_AGENT_URL}/api/rathole/clients/${serverId}/stop`,
    configureRatholeClient: (serverId: string) => `${HOST_AGENT_URL}/api/rathole/clients/${serverId}/configure`,
  }
} as const;

export { API_BASE_URL, ORCHESTRATOR_URL, RATHOLE_MANAGER_URL, HOST_AGENT_URL };
