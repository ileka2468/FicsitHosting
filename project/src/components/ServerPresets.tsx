import React from 'react';
import { Users, Zap, Star } from 'lucide-react';
import { PresetConfig } from '../types';

interface ServerPresetsProps {
  onPresetSelect: (preset: PresetConfig) => void;
}

export const ServerPresets: React.FC<ServerPresetsProps> = ({ onPresetSelect }) => {
  const presets: PresetConfig[] = [
    {
      name: 'Solo Explorer',
      description: 'Perfect for single-player worlds',
      playerCount: '1-2 players',
      recommended: false,
      config: {
        ram: 4,
        cpu: 2,
        serverSize: 'starter',
        maxPlayers: 2,
        storage: 40,
        backupFrequency: 'daily',
        serverLocation: 'us-east'
      }
    },
    {
      name: 'Small Group',
      description: 'Ideal for friends and small communities',
      playerCount: '4-8 players',
      recommended: true,
      config: {
        ram: 6,
        cpu: 3,
        serverSize: 'standard',
        maxPlayers: 8,
        storage: 80,
        backupFrequency: 'daily',
        serverLocation: 'us-east'
      }
    },
    {
      name: 'Medium Community',
      description: 'For growing communities and complex builds',
      playerCount: '12-16 players',
      recommended: false,
      config: {
        ram: 8,
        cpu: 4,
        serverSize: 'premium',
        maxPlayers: 16,
        storage: 120,
        backupFrequency: 'hourly',
        serverLocation: 'us-east'
      }
    },
    {
      name: 'Large Community',
      description: 'For big groups and public servers',
      playerCount: '24-32 players',
      recommended: false,
      config: {
        ram: 16,
        cpu: 6,
        serverSize: 'enterprise',
        maxPlayers: 32,
        storage: 160,
        backupFrequency: 'hourly',
        serverLocation: 'us-east'
      }
    },
    {
      name: 'Massive Scale',
      description: 'For huge communities and streaming servers',
      playerCount: '48-64 players',
      recommended: false,
      config: {
        ram: 32,
        cpu: 8,
        serverSize: 'ultimate',
        maxPlayers: 64,
        storage: 200,
        backupFrequency: 'hourly',
        serverLocation: 'us-east'
      }
    }
  ];

  return (
    <div className="backdrop-blur-2xl bg-white/15 rounded-2xl p-3 lg:p-4 border border-white/30 shadow-2xl w-full">
      <h3 className="text-sm lg:text-base font-bold text-white mb-3 flex items-center space-x-2">
        <Zap className="w-4 h-4" />
        <span>Quick Presets</span>
      </h3>

      <div className="space-y-2.5">
        {presets.map((preset, index) => (
          <button
            key={index}
            onClick={() => onPresetSelect(preset)}
            className={`w-full text-left p-3 rounded-lg border transition-all duration-300 hover:scale-[1.01] shadow-sm ${
              preset.recommended
                ? 'backdrop-blur-xl bg-gradient-to-r from-cyan-500/25 to-blue-500/25 border-cyan-400/40 hover:border-cyan-400/60 shadow-cyan-400/20'
                : 'backdrop-blur-xl bg-white/10 border-white/30 hover:border-white/40'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center space-x-1.5 mb-1">
                    <h4 className="text-white font-semibold text-sm">{preset.name}</h4>
                    {preset.recommended && (
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-current flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-white/80 text-xs mb-2 leading-relaxed">{preset.description}</p>
                </div>
                <div className="text-right text-xs text-white/70 space-y-0.5 backdrop-blur-xl bg-white/10 px-2 py-1.5 rounded border border-white/20 flex-shrink-0">
                  <div className="font-medium capitalize">{preset.config.serverSize}</div>
                  <div>{preset.config.storage}GB storage</div>
                  <div>{preset.config.backupFrequency} backups</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-white/60 flex-shrink-0" />
                  <span className="text-white/70 text-xs font-medium">{preset.playerCount}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};