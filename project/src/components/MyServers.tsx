import React, { useState } from 'react';
import { ServerCard } from './ServerCard';
import { ServerAdminPanel } from './ServerAdminPanel';
import { Plus, Search, Filter, AlertCircle, Loader2 } from 'lucide-react';
import { UserServer } from '../types';
import { useServers } from '../services/hooks';

interface MyServersProps {
  onCreateServer: () => void;
}

interface MyServersProps {
  onCreateServer: () => void;
}

export const MyServers: React.FC<MyServersProps> = ({ onCreateServer }) => {
  const [selectedServer, setSelectedServer] = useState<UserServer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock server data - in a real app this would come from an API
  const mockServers: UserServer[] = [
    {
      id: '1',
      name: 'My Factory World',
      status: 'online',
      config: {
        ram: 8,
        cpu: 4,
        maxPlayers: 12,
        storage: 100,
        backupFrequency: 'daily',
        serverLocation: 'us-east',
        'serverSize': 'premium'
      },
      createdAt: '2024-12-01',
      lastOnline: '2024-12-15T10:30:00Z',
      players: {
        current: 3,
        max: 12,
        list: [
          { id: '1', name: 'Player1', joinedAt: '2024-12-15T09:00:00Z', isOnline: true },
          { id: '2', name: 'Player2', joinedAt: '2024-12-15T09:15:00Z', isOnline: true },
          { id: '3', name: 'Player3', joinedAt: '2024-12-15T10:00:00Z', isOnline: true }
        ]
      },
      performance: {
        uptime: '2d 14h 30m',
        tps: 59.8,
        memoryUsage: 65,
        cpuUsage: 45
      },
      saves: [
        { id: '1', name: 'Main World', size: '2.3 GB', createdAt: '2024-12-01', isActive: true },
        { id: '2', name: 'Backup Dec 14', size: '2.1 GB', createdAt: '2024-12-14', isActive: false },
        { id: '3', name: 'Backup Dec 13', size: '2.0 GB', createdAt: '2024-12-13', isActive: false }
      ],
      settings: {
        serverName: 'My Factory World',
        description: 'A peaceful factory building server',
        gameMode: 'survival',
        difficulty: 'normal',
        pvp: false,
        whitelist: true,
        maxPlayers: 12,
        motd: 'Welcome to our factory!',
        autoSave: true,
        backupEnabled: true,
        mods: [
          { id: '1', name: 'Industrial Revolution', version: '1.16.2', enabled: true, size: '45 MB' },
          { id: '2', name: 'Tech Reborn', version: '5.2.0', enabled: true, size: '23 MB' }
        ]
      }
    },
    {
      id: '2',
      name: 'Test Server',
      status: 'offline',
      config: {
        ram: 4,
        cpu: 2,
        serverSize: 'starter',
        maxPlayers: 4,
        storage: 50,
        backupFrequency: 'weekly',
        serverLocation: 'us-west'
      },
      createdAt: '2024-11-15',
      lastOnline: '2024-12-10T15:45:00Z',
      players: {
        current: 0,
        max: 4,
        list: []
      },
      performance: {
        uptime: '0d 0h 0m',
        tps: 0,
        memoryUsage: 0,
        cpuUsage: 0
      },
      saves: [
        { id: '4', name: 'Test World', size: '500 MB', createdAt: '2024-11-15', isActive: true }
      ],
      settings: {
        serverName: 'Test Server',
        description: 'Testing new configurations',
        gameMode: 'creative',
        difficulty: 'peaceful',
        pvp: false,
        whitelist: false,
        maxPlayers: 4,
        motd: 'Test server - expect downtime',
        autoSave: true,
        backupEnabled: false,
        mods: []
      }
    }
  ];

  const filteredServers = mockServers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (selectedServer) {
    return (
      <ServerAdminPanel 
        server={selectedServer}
        onBack={() => setSelectedServer(null)}
        onServerUpdate={(updatedServer: UserServer) => {
          setSelectedServer(updatedServer);
          // In a real app, update the server list here
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Background pattern similar to admin components */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]" />
      </div>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">My Servers</h1>
          <p className="text-slate-400 text-lg">Manage and monitor your Satisfactory servers</p>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <input
              type="text"
              placeholder="Search servers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 backdrop-blur-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-3 backdrop-blur-sm bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 appearance-none cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="starting">Starting</option>
              <option value="stopping">Stopping</option>
            </select>
          </div>

          {/* Create Server Button */}
          <button
            onClick={onCreateServer}
            className="flex items-center space-x-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Server</span>
          </button>
        </div>

        {/* Server Grid */}
        {filteredServers.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-12 border border-slate-700 max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-white mb-4">No Servers Found</h3>
              <p className="text-slate-400 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No servers match your current filters.' 
                  : 'You haven\'t created any servers yet.'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={onCreateServer}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  Create Your First Server
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onManage={() => setSelectedServer(server)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
