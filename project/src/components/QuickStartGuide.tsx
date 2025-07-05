import React, { useState } from 'react';
import { X, ArrowRight, Check, Users, Settings } from 'lucide-react';
import { PresetConfig } from '../types';

interface QuickStartGuideProps {
  onClose: () => void;
  onPresetSelect: (preset: PresetConfig) => void;
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({ onClose, onPresetSelect }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Satisfactory Server Config',
      content: (
        <div className="space-y-4">
          <p className="text-white/80">
            This guide will help you configure the perfect Satisfactory server for your needs in just a few steps.
          </p>
          <div className="backdrop-blur-xl bg-cyan-500/25 border border-cyan-500/40 rounded-2xl p-6">
            <h4 className="text-cyan-300 font-semibold mb-3">What we'll configure:</h4>
            <ul className="text-cyan-200 text-sm space-y-2">
              <li>• Server size (System performance tier)</li>
              <li>• Player capacity and performance</li>
              <li>• Backup settings and location</li>
              <li>• Cost optimization</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: 'Choose Your Player Count',
      content: (
        <div className="space-y-4">
          <p className="text-white/80">
            How many players will typically be on your server? This helps us recommend the right resources.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { count: '1-2', label: 'Solo or with a friend', icon: Users },
              { count: '3-8', label: 'Small group of friends', icon: Users },
              { count: '16+', label: 'Large community server', icon: Users }
            ].map((option, index) => (
              <button
                key={index}
                className="flex items-center space-x-3 p-4 backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 border border-white/30 hover:border-white/40"
              >
                <option.icon className="w-5 h-5 text-cyan-400" />
                <div className="text-left">
                  <div className="text-white font-semibold">{option.count} players</div>
                  <div className="text-white/70 text-sm">{option.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Server Performance',
      content: (
        <div className="space-y-4">
          <p className="text-white/80">
            What's most important for your server experience?
          </p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Maximum Performance', desc: 'Best possible experience, higher cost' },
              { label: 'Balanced', desc: 'Good performance with reasonable cost' },
              { label: 'Budget-Friendly', desc: 'Adequate performance, lowest cost' }
            ].map((option, index) => (
              <button
                key={index}
                className="flex items-center space-x-3 p-4 backdrop-blur-xl bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 border border-white/30 hover:border-white/40"
              >
                <Settings className="w-5 h-5 text-green-400" />
                <div className="text-left">
                  <div className="text-white font-semibold">{option.label}</div>
                  <div className="text-white/70 text-sm">{option.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )
    },
    {
      title: 'Ready to Configure!',
      content: (
        <div className="space-y-4">
          <p className="text-white/80">
            Based on your preferences, we recommend starting with our "Small Group" preset. You can always adjust the settings later.
          </p>
          <div className="backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-2xl p-6">
            <h4 className="text-green-300 font-semibold mb-3">Recommended Configuration:</h4>
            <div className="text-green-200 text-sm space-y-2">
              <div>• Standard System (6GB RAM, balanced performance)</div>
              <div>• Up to 8 players</div>
              <div>• 80GB storage included</div>
              <div>• Daily backups included</div>
              <div>• Estimated cost: $15/month</div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleFinish = () => {
    const recommendedPreset: PresetConfig = {
      name: 'Small Group',
      description: 'Ideal for friends and small communities',
      playerCount: '3-8 players',
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
    };
    onPresetSelect(recommendedPreset);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="backdrop-blur-2xl bg-white/20 rounded-3xl p-8 max-w-md w-full border border-white/30 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Quick Start Guide</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/15"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index <= currentStep ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-4">
            {steps[currentStep].title}
          </h3>
          
          {steps[currentStep].content}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-6 py-3 text-white/80 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 rounded-xl hover:bg-white/10"
          >
            Back
          </button>
          
          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-medium"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg font-medium"
            >
              <Check className="w-4 h-4" />
              <span>Get Started</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};