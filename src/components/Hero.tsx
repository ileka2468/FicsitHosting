import React from 'react';
import { ArrowRight, Zap, Shield, Globe } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
  onViewPricing: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onGetStarted, onViewPricing }) => {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      {/* Glass Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5" />
      
      <div className="relative container mx-auto px-4">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 backdrop-blur-xl bg-white/10 border border-white/20 rounded-full px-6 py-3 mb-8 shadow-lg">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-white/90 text-sm font-medium">Professional Satisfactory Server Hosting</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Build Your Perfect
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent block">
              Satisfactory Server
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Configure, deploy, and manage high-performance Satisfactory servers with our intuitive platform. 
            Get your factory running in minutes, not hours.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-16">
            <button
              onClick={onGetStarted}
              className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center space-x-2 shadow-xl hover:shadow-cyan-400/25 backdrop-blur-sm"
            >
              <span>Start Building</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={onViewPricing}
              className="text-white/90 hover:text-white px-8 py-4 rounded-2xl text-lg font-medium transition-all duration-300 border border-white/20 hover:border-white/30 backdrop-blur-xl bg-white/5 hover:bg-white/10"
            >
              View Pricing
            </button>
          </div>

          {/* Feature Pills */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-white/70">
            <div className="flex items-center space-x-2 backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Shield className="w-5 h-5 text-green-400" />
              <span>99.9% Uptime</span>
            </div>
            <div className="flex items-center space-x-2 backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span>Instant Setup</span>
            </div>
            <div className="flex items-center space-x-2 backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Globe className="w-5 h-5 text-blue-400" />
              <span>Global Locations</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};