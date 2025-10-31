import React from 'react';
import { Cpu, HardDrive, Users, Settings, BarChart3, Download } from 'lucide-react';

export const Features: React.FC = () => {
  const features = [
    {
      icon: Cpu,
      title: 'High-Performance Hardware',
      description: 'Latest generation CPUs and NVMe SSDs for optimal game performance and minimal loading times.',
      color: 'from-cyan-400 to-blue-500'
    },
    {
      icon: Users,
      title: 'Scalable Player Support',
      description: 'From solo adventures to large communities. Scale your server resources as your factory grows.',
      color: 'from-green-400 to-emerald-500'
    },
    {
      icon: Settings,
      title: 'Easy Configuration',
      description: 'Intuitive controls and real-time previews make server setup simple for everyone.',
      color: 'from-purple-400 to-pink-500'
    },
    {
      icon: HardDrive,
      title: 'Automatic Backups',
      description: 'Never lose your progress with automated backups and one-click world restoration.',
      color: 'from-orange-400 to-red-500'
    },
    {
      icon: BarChart3,
      title: 'Performance Monitoring',
      description: 'Real-time metrics and alerts keep your server running at peak performance.',
      color: 'from-yellow-400 to-orange-500'
    },
    {
      icon: Download,
      title: 'Mod Support',
      description: 'Full support for Satisfactory mods with easy installation and management tools.',
      color: 'from-indigo-400 to-purple-500'
    }
  ];

  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Everything You Need for
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent block">
              Perfect Gameplay
            </span>
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Our platform provides all the tools and features you need to create and manage 
            the ultimate Satisfactory server experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.color} mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-4 group-hover:text-cyan-400 transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-white/80 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};