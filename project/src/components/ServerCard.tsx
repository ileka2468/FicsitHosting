import React from 'react';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Users, 
  Cpu, 
  HardDrive, 
  Activity,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { UserServer } from '../types';

interface ServerCardProps {
  server: UserServer;
  onManage: () => void;
  onAction?: (action: 'start' | 'stop' | 'restart') => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onManage, onAction }) => {
  const getStatusIcon = () => {
    switch (server.status) {
      case 'online':
        return <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />;
      case 'offline':
        return <div className="w-3 h-3 bg-red-400 rounded-full" />;
      case 'starting':
      case 'restarting':
        return <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />;
      case 'stopping':
        return <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse" />;
      case 'error':
        return <AlertTriangle className="w-3 h-3 text-red-400" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getStatusColor = () => {
    switch (server.status) {
      case 'online':
        return 'text-green-400';
      case 'offline':
        return 'text-red-400';
      case 'starting':
      case 'restarting':
        return 'text-yellow-400';
      case 'stopping':
        return 'text-orange-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const handleServerAction = (action: 'start' | 'stop' | 'restart', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction(action);
    } else {
      console.log(`${action} server ${server.id}`);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-[1.02] shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {getStatusIcon()}
            <h3 className="text-xl font-bold text-white truncate">{server.name}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium capitalize ${getStatusColor()}`}>
              {server.status}
            </span>
            {server.status === 'online' && (
              <span className="text-white/70 text-sm">• {server.performance.uptime}</span>
            )}
          </div>
        </div>
        
        <button
          onClick={onManage}
          className="p-2 backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 hover:border-white/30 transition-colors"
        >
          <Settings className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Server Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="flex items-center space-x-2 text-white/70 text-sm mb-1">
            <Users className="w-4 h-4" />
            <span>Players</span>
          </div>
          <div className="text-white font-bold">
            {server.players.current}/{server.players.max}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="flex items-center space-x-2 text-white/70 text-sm mb-1">
            <Activity className="w-4 h-4" />
            <span>TPS</span>
          </div>
          <div className="text-white font-bold">
            {server.status === 'online' ? server.performance.tps.toFixed(1) : '--'}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="flex items-center space-x-2 text-white/70 text-sm mb-1">
            <Cpu className="w-4 h-4" />
            <span>CPU</span>
          </div>
          <div className="text-white font-bold">
            {server.status === 'online' ? `${server.performance.cpuUsage}%` : '--'}
          </div>
        </div>

        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="flex items-center space-x-2 text-white/70 text-sm mb-1">
            <HardDrive className="w-4 h-4" />
            <span>RAM</span>
          </div>
          <div className="text-white font-bold">
            {server.status === 'online' ? `${server.performance.memoryUsage}%` : '--'}
          </div>
        </div>
      </div>

      {/* Server Config */}
      <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10 mb-4">
        <div className="text-white/70 text-sm mb-2">Configuration</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-white/60">RAM: <span className="text-white">{server.config.ram}GB</span></div>
          <div className="text-white/60">CPU: <span className="text-white">{server.config.cpu} cores</span></div>
          <div className="text-white/60">Storage: <span className="text-white">{server.config.storage}GB</span></div>
          <div className="text-white/60">Location: <span className="text-white capitalize">{server.config.serverLocation}</span></div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {server.status === 'offline' && (
          <button
            onClick={(e) => handleServerAction('start', e)}
            className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 hover:border-green-500/50 transition-colors text-sm font-medium"
          >
            <Play className="w-4 h-4" />
            <span>Start</span>
          </button>
        )}
        
        {server.status === 'online' && (
          <>
            <button
              onClick={(e) => handleServerAction('restart', e)}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl border border-yellow-500/30 hover:border-yellow-500/50 transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>
            
            <button
              onClick={(e) => handleServerAction('stop', e)}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 hover:border-red-500/50 transition-colors text-sm font-medium"
            >
              <Square className="w-4 h-4" />
              <span>Stop</span>
            </button>
          </>
        )}
        
        {(server.status === 'starting' || server.status === 'stopping' || server.status === 'restarting') && (
          <div className="flex-1 flex items-center justify-center py-2 px-3 bg-white/10 text-white/70 rounded-xl border border-white/20 text-sm font-medium">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin mr-2" />
            <span className="capitalize">{server.status}...</span>
          </div>
        )}
      </div>
    </div>
  );
};
