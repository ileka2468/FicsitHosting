import React from 'react';
import { Check, Star, Zap } from 'lucide-react';
import { ServerConfig } from '../types';

interface PricingSectionProps {
  onGetStarted: () => void;
  onPlanSelected: (config: ServerConfig) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({ onGetStarted, onPlanSelected }) => {
  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for solo players and small groups',
      price: 8,
      popular: false,
      config: {
        ram: 4,
        cpu: 2,
        serverSize: 'starter' as const,
        maxPlayers: 4,
        storage: 40,
        backupFrequency: 'daily' as const,
        serverLocation: 'us-east' as const
      },
      specs: {
        size: 'Starter System',
        ram: '4GB RAM',
        storage: '40GB NVMe',
        players: '2-4 players',
        backups: 'Daily backups'
      },
      features: [
        'Starter system (4GB RAM, optimized CPU)',
        'Up to 4 concurrent players',
        '40GB high-speed NVMe storage',
        'Daily automated backups',
        'Basic mod support',
        'Email support'
      ]
    },
    {
      name: 'Standard',
      description: 'Ideal for friend groups and small communities',
      price: 15,
      popular: true,
      config: {
        ram: 6,
        cpu: 3,
        serverSize: 'standard' as const,
        maxPlayers: 8,
        storage: 80,
        backupFrequency: 'daily' as const,
        serverLocation: 'us-east' as const
      },
      specs: {
        size: 'Standard System',
        ram: '6GB RAM',
        storage: '80GB NVMe',
        players: '4-8 players',
        backups: 'Every 6 hours'
      },
      features: [
        'Standard system (6GB RAM, balanced performance)',
        'Up to 8 concurrent players',
        '80GB high-speed NVMe storage',
        'Backups every 6 hours',
        'Full mod support',
        'Priority email support',
        'Performance monitoring dashboard'
      ]
    },
    {
      name: 'Premium',
      description: 'For larger groups and complex factories',
      price: 25,
      popular: false,
      config: {
        ram: 8,
        cpu: 4,
        serverSize: 'premium' as const,
        maxPlayers: 16,
        storage: 120,
        backupFrequency: 'hourly' as const,
        serverLocation: 'us-east' as const
      },
      specs: {
        size: 'Premium System',
        ram: '8GB RAM',
        storage: '120GB NVMe',
        players: '8-16 players',
        backups: 'Every 4 hours'
      },
      features: [
        'Premium system (8GB RAM, high performance)',
        'Up to 16 concurrent players',
        '120GB high-speed NVMe storage',
        'Backups every 4 hours',
        'Advanced mod management',
        'Priority support (2-hour response)',
        'Real-time performance monitoring',
        'Custom server configurations'
      ]
    },
    {
      name: 'Enterprise',
      description: 'For large communities and public servers',
      price: 35,
      popular: false,
      config: {
        ram: 16,
        cpu: 6,
        serverSize: 'enterprise' as const,
        maxPlayers: 32,
        storage: 160,
        backupFrequency: 'hourly' as const,
        serverLocation: 'us-east' as const
      },
      specs: {
        size: 'Enterprise System',
        ram: '16GB RAM',
        storage: '160GB NVMe',
        players: '16-32 players',
        backups: 'Hourly'
      },
      features: [
        'Enterprise system (16GB RAM, maximum performance)',
        'Up to 32 concurrent players',
        '160GB high-speed NVMe storage',
        'Hourly automated backups',
        'Advanced mod management & custom plugins',
        '24/7 priority support (30-min response)',
        'Real-time monitoring & alerting',
        'Dedicated server resources',
        'Custom configurations & API access'
      ]
    },
    {
      name: 'Ultimate',
      description: 'For massive servers and streaming communities',
      price: 60,
      popular: false,
      config: {
        ram: 32,
        cpu: 8,
        serverSize: 'ultimate' as const,
        maxPlayers: 64,
        storage: 200,
        backupFrequency: 'hourly' as const,
        serverLocation: 'us-east' as const
      },
      specs: {
        size: 'Ultimate System',
        ram: '32GB RAM',
        storage: '200GB NVMe',
        players: '32-64 players',
        backups: 'Hourly'
      },
      features: [
        'Ultimate system (32GB RAM, extreme performance)',
        'Up to 64 concurrent players',
        '200GB high-speed NVMe storage',
        'Hourly automated backups',
        'Premium mod management & custom plugins',
        '24/7 white-glove support (15-min response)',
        'Real-time monitoring & alerting',
        'Dedicated premium server resources',
        'Full custom configurations & API access',
        'Streaming optimization & overlays'
      ]
    }
  ];

  const renderPlanCard = (plan: typeof plans[0], index: number) => (
    <div
      key={index}
      className={`relative backdrop-blur-xl bg-white/10 rounded-3xl p-6 border transition-all duration-300 hover:scale-105 shadow-2xl flex flex-col h-full ${
        plan.popular
          ? 'border-cyan-400/50 ring-2 ring-cyan-400/20 shadow-cyan-400/25'
          : 'border-white/20 hover:border-white/30'
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-medium flex items-center space-x-1 shadow-lg">
            <Star className="w-4 h-4" />
            <span>Most Popular</span>
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">{plan.name}</h3>
        <p className="text-white/70 mb-4 text-sm lg:text-base">{plan.description}</p>
        
        <div className="mb-4">
          <span className="text-3xl lg:text-4xl font-bold text-white">${plan.price}</span>
          <span className="text-white/70">/month</span>
        </div>

        {/* Server Specs */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
          <h4 className="text-white font-semibold mb-3 text-sm">Server Specifications</h4>
          <div className="grid grid-cols-1 gap-2 text-xs lg:text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">System:</span>
              <span className="text-white font-medium">{plan.specs.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Memory:</span>
              <span className="text-white font-medium">{plan.specs.ram}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Storage:</span>
              <span className="text-white font-medium">{plan.specs.storage}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Players:</span>
              <span className="text-white font-medium">{plan.specs.players}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Backups:</span>
              <span className="text-white font-medium">{plan.specs.backups}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features list - flex-grow to push button to bottom */}
      <ul className="space-y-3 mb-6 flex-grow">
        {plan.features.map((feature, featureIndex) => (
          <li key={featureIndex} className="flex items-start space-x-3">
            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            <span className="text-white/80 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* Button at bottom */}
      <div className="mt-auto">
        <button
          onClick={() => {
            onPlanSelected(plan.config);
            onGetStarted();
          }}
          className={`w-full py-3 px-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg text-sm lg:text-base ${
            plan.popular
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white hover:scale-105 shadow-cyan-400/25'
              : 'backdrop-blur-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30'
          }`}
        >
          Get Started
        </button>
      </div>
    </div>
  );

  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Simple, Transparent
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent block">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto mb-8">
            Choose the perfect plan for your factory. All plans include our core features 
            with no hidden fees or setup costs.
          </p>
          <div className="inline-flex items-center space-x-2 backdrop-blur-xl bg-green-500/20 border border-green-500/30 rounded-full px-6 py-3 shadow-lg">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">30-day money-back guarantee</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* First Row - 3 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6">
            {plans.slice(0, 3).map((plan, index) => renderPlanCard(plan, index))}
          </div>

          {/* Second Row - 2 cards centered */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-4xl">
              {plans.slice(3).map((plan, index) => renderPlanCard(plan, index + 3))}
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-16">
          <p className="text-white/70 mb-6">
            Need a custom configuration? Contact us for enterprise solutions.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-white/60">
            <span className="backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">✓ No setup fees</span>
            <span className="backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">✓ Cancel anytime</span>
            <span className="backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">✓ 99.9% uptime SLA</span>
            <span className="backdrop-blur-xl bg-white/5 px-4 py-2 rounded-full border border-white/10">✓ Global data centers</span>
          </div>
        </div>
      </div>
    </section>
  );
};