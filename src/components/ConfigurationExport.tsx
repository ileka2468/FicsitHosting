import React, { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { ServerConfig } from '../types';
import { getTierDisplayName } from '../utils/calculations';

interface ConfigurationExportProps {
  config: ServerConfig;
}

export const ConfigurationExport: React.FC<ConfigurationExportProps> = ({ config }) => {
  const [copied, setCopied] = useState(false);

  const configData = {
    timestamp: new Date().toISOString(),
    serverConfig: config,
    metadata: {
      platform: 'Satisfactory Server Config',
      version: '1.0.0'
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(configData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `satisfactory-server-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="backdrop-blur-2xl bg-white/15 rounded-3xl p-4 border border-white/30 shadow-2xl h-fit">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
        <Download className="w-5 h-5" />
        <span>Export Configuration</span>
      </h3>

      <div className="space-y-4">
        {/* Quick Overview */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="mb-3">
            <div className="text-white/60 text-xs">Server Tier:</div>
            <div className="text-white font-semibold text-sm">{getTierDisplayName(config.serverSize)} Plan</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-white/60">RAM:</span>
              <span className="text-white font-medium ml-2">{config.ram}GB</span>
            </div>
            <div>
              <span className="text-white/60">CPU:</span>
              <span className="text-white font-medium ml-2">{config.cpu} cores</span>
            </div>
            <div>
              <span className="text-white/60">Players:</span>
              <span className="text-white font-medium ml-2">{config.maxPlayers}</span>
            </div>
            <div>
              <span className="text-white/60">Storage:</span>
              <span className="text-white font-medium ml-2">{config.storage}GB</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleCopy}
            className="w-full backdrop-blur-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 rounded-2xl py-3 px-4 transition-all duration-300 border border-cyan-500/30 shadow-lg hover:shadow-cyan-400/25 flex items-center justify-center space-x-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="font-medium">{copied ? 'Copied!' : 'Copy Config'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="w-full backdrop-blur-xl bg-white/15 hover:bg-white/25 text-white rounded-2xl py-3 px-4 transition-all duration-300 border border-white/30 shadow-lg flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span className="font-medium">Download JSON</span>
          </button>
        </div>

        {/* Configuration Preview */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10">
          <div className="text-xs text-white/60 mb-2">Preview:</div>
          <div className="bg-black/30 rounded-lg p-3 text-xs font-mono text-white/70 max-h-32 overflow-y-auto border border-white/10">
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(configData, null, 2).substring(0, 200)}...
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
