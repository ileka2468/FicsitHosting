import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Play, 
  Square, 
  RotateCcw, 
  Users, 
  Settings, 
  Database, 
  Download,
  Upload,
  Trash2,
  Edit3,
  Save,
  X,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserServer, ServerSettings } from '../types';

interface ServerAdminPanelProps {
  server: UserServer;
  onBack: () => void;
  onServerUpdate: (server: UserServer) => void;
}

export const ServerAdminPanel: React.FC<ServerAdminPanelProps> = ({ 
  server, 
  onBack, 
  onServerUpdate 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'saves' | 'settings' | 'players'>('overview');
  const [editingSettings, setEditingSettings] = useState(false);
  const [settings, setSettings] = useState<ServerSettings>(server.settings);

  const handleServerAction = (action: 'start' | 'stop' | 'restart') => {
    // In a real app, this would make API calls
    console.log(`${action} server ${server.id}`);
    
    // Mock status update
    const newStatus = action === 'start' ? 'starting' : 
                     action === 'stop' ? 'stopping' : 'restarting';
    
    onServerUpdate({
      ...server,
      status: newStatus
    });

    // Simulate status change after delay
    setTimeout(() => {
      const finalStatus = action === 'start' ? 'online' : 
                         action === 'stop' ? 'offline' : 'online';
      onServerUpdate({
        ...server,
        status: finalStatus
      });
    }, 3000);
  };

  const handleSaveSettings = () => {
    onServerUpdate({
      ...server,
      settings: settings
    });
    setEditingSettings(false);
  };

  const handleDeleteSave = (saveId: string) => {
    const updatedSaves = server.saves.filter(save => save.id !== saveId);
    onServerUpdate({
      ...server,
      saves: updatedSaves
    });
  };

  const handleActivateSave = (saveId: string) => {
    const updatedSaves = server.saves.map(save => ({
      ...save,
      isActive: save.id === saveId
    }));
    onServerUpdate({
      ...server,
      saves: updatedSaves
    });
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Server Status */}
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-4">Server Status</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-white/70 text-sm mb-1">Status</div>
            <div className={`font-bold capitalize ${
              server.status === 'online' ? 'text-green-400' :
              server.status === 'offline' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {server.status}
            </div>
          </div>
          
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-white/70 text-sm mb-1">Uptime</div>
            <div className="text-white font-bold">
              {server.status === 'online' ? server.performance.uptime : '--'}
            </div>
          </div>
          
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-white/70 text-sm mb-1">Players Online</div>
            <div className="text-white font-bold">
              {server.players.current}/{server.players.max}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-white/70 text-sm mb-2">TPS (Ticks Per Second)</div>
            <div className="text-2xl font-bold text-white mb-1">
              {server.status === 'online' ? server.performance.tps.toFixed(1) : '--'}
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  server.performance.tps > 55 ? 'bg-green-400' :
                  server.performance.tps > 45 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: server.status === 'online' ? `${(server.performance.tps / 60) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-white/70 text-sm mb-2">Memory Usage</div>
            <div className="text-2xl font-bold text-white mb-1">
              {server.status === 'online' ? `${server.performance.memoryUsage}%` : '--'}
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  server.performance.memoryUsage < 70 ? 'bg-green-400' :
                  server.performance.memoryUsage < 85 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: server.status === 'online' ? `${server.performance.memoryUsage}%` : '0%' }}
              />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-white/70 text-sm mb-2">CPU Usage</div>
            <div className="text-2xl font-bold text-white mb-1">
              {server.status === 'online' ? `${server.performance.cpuUsage}%` : '--'}
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  server.performance.cpuUsage < 70 ? 'bg-green-400' :
                  server.performance.cpuUsage < 85 ? 'bg-yellow-400' : 'bg-red-400'
                }`}
                style={{ width: server.status === 'online' ? `${server.performance.cpuUsage}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex space-x-3">
          {server.status === 'offline' && (
            <button
              onClick={() => handleServerAction('start')}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-2xl border border-green-500/30 hover:border-green-500/50 transition-all duration-300 font-medium"
            >
              <Play className="w-5 h-5" />
              <span>Start Server</span>
            </button>
          )}
          
          {server.status === 'online' && (
            <>
              <button
                onClick={() => handleServerAction('restart')}
                className="flex items-center space-x-2 px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-2xl border border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300 font-medium"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Restart</span>
              </button>
              
              <button
                onClick={() => handleServerAction('stop')}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-2xl border border-red-500/30 hover:border-red-500/50 transition-all duration-300 font-medium"
              >
                <Square className="w-5 h-5" />
                <span>Stop Server</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderSaves = () => (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">World Saves</h3>
          <div className="flex space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl border border-blue-500/30 transition-colors">
              <Upload className="w-4 h-4" />
              <span>Upload</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Create Backup</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {server.saves.map((save) => (
            <div
              key={save.id}
              className={`backdrop-blur-xl bg-white/5 rounded-2xl p-4 border transition-all duration-300 ${
                save.isActive 
                  ? 'border-cyan-400/50 bg-cyan-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-white font-semibold">{save.name}</h4>
                    {save.isActive && (
                      <span className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium border border-cyan-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-white/70 mt-1">
                    <span>Size: {save.size}</span>
                    <span>Created: {save.createdAt}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!save.isActive && (
                    <button
                      onClick={() => handleActivateSave(save.id)}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors"
                      title="Activate Save"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl border border-blue-500/30 transition-colors" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  
                  {!save.isActive && (
                    <button
                      onClick={() => handleDeleteSave(save.id)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors"
                      title="Delete Save"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Server Settings</h3>
          <div className="flex space-x-2">
            {editingSettings ? (
              <>
                <button
                  onClick={handleSaveSettings}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => {
                    setEditingSettings(false);
                    setSettings(server.settings);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingSettings(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl border border-blue-500/30 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4">Basic Settings</h4>
            
            <div>
              <label className="block text-white/70 text-sm mb-2">Server Name</label>
              {editingSettings ? (
                <input
                  type="text"
                  value={settings.serverName}
                  onChange={(e) => setSettings({ ...settings, serverName: e.target.value })}
                  className="w-full p-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              ) : (
                <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white">
                  {settings.serverName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Description</label>
              {editingSettings ? (
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                  className="w-full p-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 resize-none h-20"
                />
              ) : (
                <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white">
                  {settings.description}
                </div>
              )}
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">MOTD (Message of the Day)</label>
              {editingSettings ? (
                <input
                  type="text"
                  value={settings.motd}
                  onChange={(e) => setSettings({ ...settings, motd: e.target.value })}
                  className="w-full p-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              ) : (
                <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white">
                  {settings.motd}
                </div>
              )}
            </div>
          </div>

          {/* Game Settings */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-4">Game Settings</h4>
            
            <div>
              <label className="block text-white/70 text-sm mb-2">Game Mode</label>
              {editingSettings ? (
                <select
                  value={settings.gameMode}
                  onChange={(e) => setSettings({ ...settings, gameMode: e.target.value as any })}
                  className="w-full p-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                  <option value="spectator">Spectator</option>
                </select>
              ) : (
                <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white capitalize">
                  {settings.gameMode}
                </div>
              )}
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Difficulty</label>
              {editingSettings ? (
                <select
                  value={settings.difficulty}
                  onChange={(e) => setSettings({ ...settings, difficulty: e.target.value as any })}
                  className="w-full p-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                >
                  <option value="peaceful">Peaceful</option>
                  <option value="easy">Easy</option>
                  <option value="normal">Normal</option>
                  <option value="hard">Hard</option>
                </select>
              ) : (
                <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white capitalize">
                  {settings.difficulty}
                </div>
              )}
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Max Players</label>
              {editingSettings ? (
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.maxPlayers}
                  onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
                  className="w-full p-3 backdrop-blur-xl bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                />
              ) : (
                <div className="p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl text-white">
                  {settings.maxPlayers}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toggle Settings */}
        <div className="mt-6 pt-6 border-t border-white/20">
          <h4 className="text-lg font-semibold text-white mb-4">Advanced Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries({
              pvp: 'PvP',
              whitelist: 'Whitelist',
              autoSave: 'Auto Save',
              backupEnabled: 'Backups'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-3 backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
                <span className="text-white">{label}</span>
                {editingSettings ? (
                  <button
                    onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof ServerSettings] })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings[key as keyof ServerSettings] ? 'bg-cyan-500' : 'bg-white/20'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings[key as keyof ServerSettings] ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                  </button>
                ) : (
                  <div className={`w-4 h-4 rounded-full ${
                    settings[key as keyof ServerSettings] ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="space-y-6">
      <div className="backdrop-blur-xl bg-white/10 rounded-3xl p-6 border border-white/20">
        <h3 className="text-xl font-bold text-white mb-6">
          Online Players ({server.players.current}/{server.players.max})
        </h3>

        {server.players.list.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">No players currently online</p>
          </div>
        ) : (
          <div className="space-y-3">
            {server.players.list.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-4 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    player.isOnline ? 'bg-green-400' : 'bg-red-400'
                  }`} />
                  <span className="text-white font-medium">{player.name}</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className="text-white/70 text-sm">
                    Joined: {new Date(player.joinedAt).toLocaleTimeString()}
                  </span>
                  
                  <div className="flex space-x-2">
                    <button className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl border border-blue-500/30 transition-colors" title="View Player">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-colors" title="Kick Player">
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900" />
      <div className="absolute inset-0 opacity-20">
        <div className="w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_70%)]" />
      </div>
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 backdrop-blur-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-2xl text-white transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Servers</span>
          </button>
          
          <div>
            <h1 className="text-3xl font-bold text-white">{server.name}</h1>
            <p className="text-white/70">Server Administration</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 backdrop-blur-xl bg-white/10 p-2 rounded-2xl border border-white/20 w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: Settings },
            { id: 'saves', label: 'Saves', icon: Database },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'players', label: 'Players', icon: Users }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'saves' && renderSaves()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'players' && renderPlayers()}
      </main>
    </div>
  );
};
