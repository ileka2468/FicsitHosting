import React from 'react';
import { Server, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onQuickStart: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onQuickStart }) => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-lg">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Satisfactory Server Config</h1>
              <p className="text-slate-400 text-sm">Professional server configuration platform</p>
            </div>
          </div>
          
          <button
            onClick={onQuickStart}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Quick Start</span>
          </button>
        </div>
      </div>
    </header>
  );
};