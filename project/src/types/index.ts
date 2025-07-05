export interface ServerConfig {
  ram: number; // GB
  cpu: number; // cores (internal use)
  serverSize: 'starter' | 'standard' | 'premium' | 'enterprise' | 'ultimate'; // Public facing size
  maxPlayers: number;
  storage: number; // GB
  backupFrequency: 'hourly' | 'daily' | 'weekly';
  serverLocation: 'us-east' | 'us-west' | 'eu-west' | 'asia-pacific';
}

export interface PerformanceMetrics {
  serverScore: number; // 0-100
  expectedTPS: number; // Ticks per second
  memoryUsage: number; // Percentage
  cpuUsage: number; // Percentage
  networkLatency: number; // ms
  warnings: string[];
}

export interface PresetConfig {
  name: string;
  description: string;
  playerCount: string;
  config: ServerConfig;
  recommended: boolean;
}

export interface CostBreakdown {
  ram: number;
  cpu: number;
  storage: number;
  backup: number;
  total: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'starter' | 'standard' | 'premium' | 'enterprise' | 'ultimate';
  servers: UserServer[];
}

export interface UserServer {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'starting' | 'stopping' | 'restarting' | 'error';
  config: ServerConfig;
  createdAt: string;
  lastOnline?: string;
  gamePort?: number;
  queryPort?: number;
  players: {
    current: number;
    max: number;
    list: Player[];
  };
  performance: {
    uptime: string;
    tps: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  saves: SaveFile[];
  settings: ServerSettings;
}

export interface Player {
  id: string;
  name: string;
  joinedAt: string;
  isOnline: boolean;
}

export interface SaveFile {
  id: string;
  name: string;
  size: string;
  createdAt: string;
  isActive: boolean;
}

export interface ServerSettings {
  serverName: string;
  description: string;
  gameMode: 'survival' | 'creative' | 'adventure' | 'spectator';
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  pvp: boolean;
  whitelist: boolean;
  maxPlayers: number;
  motd: string;
  autoSave: boolean;
  backupEnabled: boolean;
  mods: ModInfo[];
}

export interface ModInfo {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  size: string;
}