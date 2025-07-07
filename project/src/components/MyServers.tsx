import React, { useState } from 'react';
import { ServerCard } from './ServerCard';
import { ServerAdminPanel } from './ServerAdminPanel';
import { Plus, Search, Filter, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { UserServer } from '../types';
import { useServers } from '../services/hooks';

interface MyServersProps {
  onCreateServer: () => void;
}

export const MyServers: React.FC<MyServersProps> = ({ onCreateServer }) => {
  const [selectedServer, setSelectedServer] = useState<UserServer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const {
    servers,
    loading,
    error,
    refreshServers,
    startServer,
    stopServer,
    restartServer,
    deleteServer,
  } = useServers();

  const filteredServers = servers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || server.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleServerAction = async (serverId: string, action: string) => {
    try {
      switch (action) {
        case 'start':
          await startServer(serverId);
          break;
        case 'stop':
          await stopServer(serverId);
          break;
        case 'restart':
          await restartServer(serverId);
          break;
        case 'delete':
          if (window.confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
            await deleteServer(serverId);
          }
          break;
        default:
          console.warn('Unknown action:', action);
      }
    } catch (error) {
      console.error(`Failed to ${action} server:`, error);
    }
  };

  if (selectedServer) {
    return (
      <ServerAdminPanel
        server={selectedServer}
        onBack={() => setSelectedServer(null)}
        onServerUpdate={(updatedServer) => {
          setSelectedServer(updatedServer);
          refreshServers();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Servers</h1>
          <p className="text-gray-600 mt-1">Manage your Satisfactory game servers</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshServers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onCreateServer}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Server
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search servers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[140px]"
          >
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
            <option value="starting">Starting</option>
            <option value="stopping">Stopping</option>
            <option value="restarting">Restarting</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {loading && servers.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Loading servers...</span>
          </div>
        </div>
      )}

      {!loading && servers.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No servers yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first Satisfactory server to get started with hosting your factory world.
            </p>
            <button
              onClick={onCreateServer}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Your First Server
            </button>
          </div>
        </div>
      )}

      {!loading && servers.length > 0 && filteredServers.length === 0 && (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No servers found</h3>
            <p className="text-gray-600">
              No servers match your current search criteria. Try adjusting your search or filter settings.
            </p>
          </div>
        </div>
      )}

      {filteredServers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onManage={() => setSelectedServer(server)}
              onAction={(action) => handleServerAction(server.id, action)}
            />
          ))}
        </div>
      )}

      {servers.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{servers.length}</div>
            <div className="text-sm text-gray-600">Total Servers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{servers.filter(s => s.status === 'online').length}</div>
            <div className="text-sm text-gray-600">Online</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{servers.filter(s => s.status === 'offline').length}</div>
            <div className="text-sm text-gray-600">Offline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{servers.reduce((total, server) => total + server.players.current, 0)}</div>
            <div className="text-sm text-gray-600">Active Players</div>
          </div>
        </div>
      )}
    </div>
  );
};

