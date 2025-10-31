import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../../config/api';

interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  verified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export const UserManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('satisfactory_auth_token');
      if (!token) return;

      // We can only get the current user info - no admin user list endpoint exists yet
      const response = await fetch(API_ENDPOINTS.auth.validate, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        setCurrentUser({
          id: userInfo.id.toString(),
          username: userInfo.username,
          email: userInfo.email,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          roles: userInfo.roles || [],
          verified: userInfo.emailVerified || false,
          createdAt: userInfo.createdAt || new Date().toISOString(),
          lastLogin: userInfo.lastLoginAt
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user info');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading user information...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">User Management</h2>
            <p className="text-slate-400">Manage user accounts and permissions</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-red-300 hover:text-red-100 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Implementation Status */}
      <div className="bg-yellow-900/50 border border-yellow-500 rounded-lg p-4">
        <h3 className="text-yellow-200 font-semibold mb-2">⚠️ Admin Endpoints Not Implemented</h3>
        <p className="text-yellow-100 mb-2">
          The following admin endpoints need to be implemented in the backend:
        </p>
        <ul className="text-yellow-100 text-sm space-y-1 ml-4">
          <li>• <code>GET /api/admin/users</code> - List all users</li>
          <li>• <code>PUT /api/admin/users/{'{userId}'}/roles</code> - Update user roles</li>
          <li>• <code>DELETE /api/admin/users/{'{userId}'}</code> - Delete user</li>
          <li>• <code>PUT /api/admin/users/{'{userId}'}/status</code> - Enable/disable user</li>
        </ul>
        <p className="text-yellow-100 text-sm mt-2">
          Currently showing info for the authenticated user only.
        </p>
      </div>

      {/* Current User Info */}
      {currentUser && (
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current User Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-16 w-16">
                  <div className="h-16 w-16 rounded-full bg-cyan-600 flex items-center justify-center">
                    <span className="text-white font-medium text-xl">
                      {currentUser.firstName ? currentUser.firstName[0] : currentUser.username[0]}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-lg font-medium text-white">
                    {currentUser.firstName && currentUser.lastName 
                      ? `${currentUser.firstName} ${currentUser.lastName}` 
                      : currentUser.username}
                  </div>
                  <div className="text-sm text-slate-400">@{currentUser.username}</div>
                  <div className="text-sm text-white">{currentUser.email}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div>
                  <label className="text-slate-400 text-sm">User ID</label>
                  <div className="text-white">{currentUser.id}</div>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Email Verified</label>
                  <div className={`${currentUser.verified ? 'text-green-400' : 'text-red-400'}`}>
                    {currentUser.verified ? 'Yes' : 'No'}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Roles</label>
                  <div className="flex flex-wrap gap-1">
                    {currentUser.roles.map(role => (
                      <span
                        key={role}
                        className={`px-2 py-1 text-xs rounded-full ${
                          role === 'ADMIN' ? 'bg-red-900/50 text-red-200' :
                          role === 'MODERATOR' ? 'bg-yellow-900/50 text-yellow-200' :
                          'bg-blue-900/50 text-blue-200'
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Created At</label>
                  <div className="text-white">
                    {new Date(currentUser.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 text-sm">Last Login</label>
                  <div className="text-white">
                    {currentUser.lastLogin 
                      ? new Date(currentUser.lastLogin).toLocaleDateString() 
                      : 'Never'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Actions */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Available Actions</h3>
        <div className="space-y-3">
          <button
            onClick={fetchCurrentUser}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh User Info
          </button>
          <div className="text-sm text-slate-400">
            More user management features will be available once the backend admin endpoints are implemented.
          </div>
        </div>
      </div>
    </div>
  );
};
