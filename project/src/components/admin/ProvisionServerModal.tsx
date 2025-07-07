import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface ProvisionServerModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface Node {
  nodeId: string;
  hostname: string;
  ipAddress: string;
  maxServers: number;
  currentServers: number;
  status: string;
}

export const ProvisionServerModal: React.FC<ProvisionServerModalProps> = ({ onClose, onSuccess }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    userId: '',
    serverName: '',
    ramAllocation: 4,
    cpuAllocation: 2,
    maxPlayers: 8,
    serverPassword: '',
    preferredNodeId: ''
  });

  useEffect(() => {
    loadUsers();
    loadNodes();
  }, []);

  const getAuthToken = () => localStorage.getItem('satisfactory_auth_token');

  const loadUsers = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.admin.users, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadNodes = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(API_ENDPOINTS.nodes.list, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setNodes(await response.json());
      }
    } catch (err) {
      console.error('Error loading nodes:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) throw new Error('No auth token');

      const payload = {
        userId: formData.userId,
        serverName: formData.serverName,
        ramAllocation: formData.ramAllocation,
        cpuAllocation: formData.cpuAllocation,
        maxPlayers: formData.maxPlayers,
        serverPassword: formData.serverPassword || undefined,
        preferredNodeId: formData.preferredNodeId || undefined
      };

      const response = await fetch(API_ENDPOINTS.servers.provision, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to provision server');
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision server');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'ramAllocation' || name === 'cpuAllocation' || name === 'maxPlayers'
        ? parseInt(value)
        : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl mx-4 border border-slate-700">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Provision New Server</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                User
              </label>
              <select
                name="userId"
                value={formData.userId}
                onChange={handleInputChange}
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Select a user</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName} (${user.username})`
                      : user.username
                    } - {user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* Server Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Server Name
              </label>
              <input
                type="text"
                name="serverName"
                value={formData.serverName}
                onChange={handleInputChange}
                required
                placeholder="My Satisfactory Server"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* RAM Allocation */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                RAM Allocation (GB)
              </label>
              <input
                type="number"
                name="ramAllocation"
                value={formData.ramAllocation}
                onChange={handleInputChange}
                min="1"
                max="32"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* CPU Allocation */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                CPU Cores
              </label>
              <input
                type="number"
                name="cpuAllocation"
                value={formData.cpuAllocation}
                onChange={handleInputChange}
                min="1"
                max="16"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Max Players */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Max Players
              </label>
              <input
                type="number"
                name="maxPlayers"
                value={formData.maxPlayers}
                onChange={handleInputChange}
                min="1"
                max="100"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            {/* Server Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Server Password (Optional)
              </label>
              <input
                type="password"
                name="serverPassword"
                value={formData.serverPassword}
                onChange={handleInputChange}
                placeholder="Leave empty for no password"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Preferred Node */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Preferred Node (Optional)
            </label>
            <select
              name="preferredNodeId"
              value={formData.preferredNodeId}
              onChange={handleInputChange}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Auto-select best node</option>
              {nodes.map(node => (
                <option key={node.nodeId} value={node.nodeId}>
                  {node.nodeId} ({node.ipAddress}) - {node.currentServers}/{node.maxServers} servers
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Provisioning...' : 'Provision Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
