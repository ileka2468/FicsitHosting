import React from 'react';
import { ServerConfig, PerformanceMetrics } from '../types';
import { ResourceSlider } from './ResourceSlider';
import { DropdownSelect } from './DropdownSelect';
import { AlertTriangle } from 'lucide-react';

interface ConfigurationPanelProps {
  config: ServerConfig;
  onConfigChange: (config: Partial<ServerConfig>) => void;
  performanceMetrics: PerformanceMetrics;
}

export const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  config,
  onConfigChange,
  performanceMetrics
}) => {
  const backupOptions = [
    { value: 'hourly', label: 'Hourly Backups' },
    { value: 'daily', label: 'Daily Backups' },
    { value: 'weekly', label: 'Weekly Backups' }
  ];

  const locationOptions = [
    { value: 'us-east', label: 'US East (Virginia)' },
    { value: 'us-west', label: 'US West (Oregon)' },
    { value: 'eu-west', label: 'EU West (Ireland)' },
    { value: 'asia-pacific', label: 'Asia Pacific (Singapore)' }
  ];

  const serverSizeOptions = [
    { value: 'starter', label: 'Starter System (4GB RAM, optimized CPU)' },
    { value: 'standard', label: 'Standard System (6GB RAM, balanced performance)' },
    { value: 'premium', label: 'Premium System (8GB RAM, high performance)' },
    { value: 'enterprise', label: 'Enterprise System (16GB RAM, maximum performance)' },
    { value: 'ultimate', label: 'Ultimate System (32GB RAM, ultra performance)' }
  ];

  // Update RAM and CPU based on server size selection
  const handleServerSizeChange = (serverSize: string) => {
    const sizeConfigs = {
      starter: { ram: 4, cpu: 2 },
      standard: { ram: 6, cpu: 3 },
      premium: { ram: 8, cpu: 4 },
      enterprise: { ram: 16, cpu: 6 },
      ultimate: { ram: 32, cpu: 8 }
    };
    
    const sizeConfig = sizeConfigs[serverSize as keyof typeof sizeConfigs];
    if (sizeConfig) {
      onConfigChange({ 
        serverSize: serverSize as any,
        ram: sizeConfig.ram,
        cpu: sizeConfig.cpu
      });
    }
  };

  return (
    <div className="backdrop-blur-2xl bg-white/15 rounded-3xl p-6 lg:p-8 border border-white/30 shadow-2xl relative z-30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 space-y-4 sm:space-y-0">
        <h2 className="text-2xl lg:text-3xl font-bold text-white">Server Configuration</h2>
        {performanceMetrics.warnings.length > 0 && (
          <div className="flex items-center space-x-2 text-amber-400 backdrop-blur-xl bg-amber-500/15 px-3 lg:px-4 py-2 rounded-full border border-amber-500/30">
            <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5" />
            <span className="text-sm font-medium">{performanceMetrics.warnings.length} warnings</span>
          </div>
        )}
      </div>

      <div className="space-y-8 lg:space-y-10">
        {/* Server Size Selection */}
        <div className="grid grid-cols-1 gap-6 lg:gap-8">
          <DropdownSelect
            label="Server Size"
            value={config.serverSize}
            options={serverSizeOptions}
            onChange={handleServerSizeChange}
            tooltip="Choose your server's performance tier. Each size includes optimized RAM and CPU allocation."
          />
        </div>

        {/* Resource Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <ResourceSlider
            label="Max Players"
            value={config.maxPlayers}
            min={1}
            max={32}
            step={1}
            unit="players"
            onChange={(value) => onConfigChange({ maxPlayers: value })}
            color="from-green-400 to-emerald-500"
            tooltip="Maximum number of players that can join your server simultaneously."
          />
          
          <ResourceSlider
            label="Storage"
            value={config.storage}
            min={40}
            max={200}
            step={10}
            unit="GB"
            onChange={(value) => onConfigChange({ storage: value })}
            color="from-orange-400 to-red-500"
            tooltip="Disk space for world saves, backups, and server files. Base storage included with each tier."
          />
        </div>

        {/* Dropdown Selects */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <DropdownSelect
            label="Backup Frequency"
            value={config.backupFrequency}
            options={backupOptions}
            onChange={(value) => onConfigChange({ backupFrequency: value as any })}
            tooltip="How often your world save is backed up automatically."
          />
          
          <DropdownSelect
            label="Server Location"
            value={config.serverLocation}
            options={locationOptions}
            onChange={(value) => onConfigChange({ serverLocation: value as any })}
            tooltip="Physical location of your server. Choose closest to your players."
          />
        </div>

        {/* Warnings */}
        {performanceMetrics.warnings.length > 0 && (
          <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 lg:p-6 shadow-lg">
            <h3 className="flex items-center space-x-2 text-amber-400 font-semibold mb-3 lg:mb-4">
              <AlertTriangle className="w-4 lg:w-5 h-4 lg:h-5" />
              <span className="text-sm lg:text-base">Configuration Warnings</span>
            </h3>
            <ul className="space-y-2 text-amber-300 text-sm lg:text-base">
              {performanceMetrics.warnings.map((warning, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-amber-400 mt-1">•</span>
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};