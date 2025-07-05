import React from 'react';
import { Activity, Zap, HardDrive, Cpu } from 'lucide-react';
import { PerformanceMetrics as IPerformanceMetrics, ServerConfig } from '../types';

interface PerformanceMetricsProps {
  metrics: IPerformanceMetrics;
  config: ServerConfig;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics, config }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    if (score >= 60) return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30';
    return 'from-red-500/20 to-pink-500/20 border-red-500/30';
  };

  return (
    <div className="backdrop-blur-2xl bg-white/15 rounded-3xl p-4 border border-white/30 shadow-2xl h-fit">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
        <Activity className="w-5 h-5" />
        <span>Performance Metrics</span>
      </h3>

      <div className="space-y-4">
        {/* Server Score */}
        <div className={`backdrop-blur-xl bg-gradient-to-r ${getScoreBg(metrics.serverScore)} rounded-2xl p-4 border shadow-lg`}>
          <div className="flex items-center justify-between">
            <span className="text-white font-semibold">Server Score</span>
            <span className={`text-2xl font-bold ${getScoreColor(metrics.serverScore)}`}>
              {metrics.serverScore}/100
            </span>
          </div>
          <div className="mt-3 backdrop-blur-xl bg-white/10 rounded-full h-2 border border-white/20">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                metrics.serverScore >= 80 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                metrics.serverScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 
                'bg-gradient-to-r from-red-400 to-pink-500'
              }`}
              style={{ width: `${metrics.serverScore}%` }}
            />
          </div>
        </div>

        {/* Performance Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-white/80 text-xs font-medium">Expected TPS</span>
            </div>
            <span className="text-white font-bold text-lg">{metrics.expectedTPS}</span>
          </div>

          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <HardDrive className="w-4 h-4 text-green-400" />
              <span className="text-white/80 text-xs font-medium">Memory Usage</span>
            </div>
            <span className="text-white font-bold text-lg">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>

          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span className="text-white/80 text-xs font-medium">CPU Usage</span>
            </div>
            <span className="text-white font-bold text-lg">{metrics.cpuUsage.toFixed(1)}%</span>
          </div>

          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-3 border border-white/10 shadow-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span className="text-white/80 text-xs font-medium">Latency</span>
            </div>
            <span className="text-white font-bold text-lg">{metrics.networkLatency}ms</span>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10 shadow-lg">
          <h4 className="text-white font-semibold mb-3">Resource Utilization</h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/80">RAM</span>
                <span className="text-white/80">{metrics.memoryUsage.toFixed(1)}%</span>
              </div>
              <div className="backdrop-blur-xl bg-white/10 rounded-full h-2 border border-white/20">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${Math.min(100, metrics.memoryUsage)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/80">CPU</span>
                <span className="text-white/80">{metrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="backdrop-blur-xl bg-white/10 rounded-full h-2 border border-white/20">
                <div
                  className="bg-gradient-to-r from-purple-400 to-pink-500 h-full rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${Math.min(100, metrics.cpuUsage)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};