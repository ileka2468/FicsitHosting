import React, { useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { ServerConfig } from '../types';
import { getCostBreakdown } from '../utils/calculations';

interface CostCalculatorProps {
  config: ServerConfig;
  monthlyCost: number;
}

export const CostCalculator: React.FC<CostCalculatorProps> = ({ config, monthlyCost }) => {
  const [showBreakdown, setShowBreakdown] = useState(true);
  const breakdown = getCostBreakdown(config);

  const yearlyDiscount = 0.15; // 15% discount for yearly
  const yearlyCost = monthlyCost * 12 * (1 - yearlyDiscount);

  return (
    <div className="backdrop-blur-2xl bg-white/15 rounded-2xl p-3 lg:p-4 border border-white/30 shadow-2xl w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm lg:text-base font-bold text-white flex items-center space-x-2">
          <DollarSign className="w-4 h-4" />
          <span>Cost Calculator</span>
        </h3>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors backdrop-blur-xl bg-white/10 px-2.5 py-1 rounded-full border border-white/30"
        >
          {showBreakdown ? 'Hide' : 'Show'} Breakdown
        </button>
      </div>

      <div className="space-y-3">
        {/* Monthly Cost */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-green-300 font-semibold text-sm">Monthly</span>
            <span className="text-xl font-bold text-green-400">
              ${monthlyCost.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-green-300 text-xs mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Per month</span>
          </div>
        </div>

        {/* Yearly Cost */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg p-3 border border-blue-500/30 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-blue-300 font-semibold text-sm">Yearly</span>
            <span className="text-xl font-bold text-blue-400">
              ${yearlyCost.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center space-x-1 text-blue-300 text-xs mt-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Save ${(monthlyCost * 12 - yearlyCost).toFixed(2)} (15% off)</span>
          </div>
        </div>

        {/* Cost Breakdown */}
        {showBreakdown && (
          <div className="space-y-2.5 pt-2.5 border-t border-white/20">
            <h4 className="text-white font-semibold text-sm">Cost Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-xs backdrop-blur-xl bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-white/80 flex items-center space-x-2">
                  <span>RAM ({config.ram} GB)</span>
                  {config.ram > 16 && (
                    <span className="text-orange-400 text-[10px] px-1.5 py-0.5 bg-orange-500/20 rounded border border-orange-500/30 flex-shrink-0">
                      Premium
                    </span>
                  )}
                </span>
                <span className="text-white font-medium">${breakdown.ram.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs backdrop-blur-xl bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-white/80">CPU ({config.cpu} cores)</span>
                <span className="text-white font-medium">${breakdown.cpu.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs backdrop-blur-xl bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-white/80">Storage ({config.storage} GB)</span>
                <span className="text-white font-medium">${breakdown.storage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs backdrop-blur-xl bg-white/5 p-2.5 rounded border border-white/10">
                <span className="text-white/80">Backups ({config.backupFrequency})</span>
                <span className="text-white font-medium">${breakdown.backup.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-white/20 pt-2 backdrop-blur-xl bg-white/10 p-2.5 rounded">
                <span className="text-white text-sm">Total</span>
                <span className="text-white text-sm">${breakdown.total.toFixed(2)}</span>
              </div>
            </div>
            {/* Pricing Notes */}
            <div className="mt-2.5 p-2.5 backdrop-blur-xl bg-blue-500/10 rounded border border-blue-500/20">
              <div className="text-[11px] text-blue-300 space-y-1 leading-relaxed">
                <div>• Storage: First 50GB free, then $0.02/GB</div>
                <div>• RAM: $1.50/GB up to 16GB, then $3.00/GB</div>
                <div>• CPU: $1.50 per core</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};