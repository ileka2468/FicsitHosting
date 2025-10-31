import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_ENDPOINTS } from '../config/api';
import { ServerManagement } from './admin/ServerManagement';
import { SystemDiagnostics } from './admin/SystemDiagnostics';
import { UserManagement } from './admin/UserManagement';
import { TunnelManagement } from './admin/TunnelManagement';
import { NodeMonitoring } from './admin/NodeMonitoring';

interface AdminDashboardProps {
  user: User;
}

type AdminTab = 'servers' | 'users' | 'nodes' | 'tunnels' | 'diagnostics';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('servers');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('satisfactory_auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.auth.validate, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userInfo = await response.json();
        const hasAdminRole = userInfo.roles?.includes('ADMIN') || userInfo.roles?.includes('SERVICE_ACCOUNT');
        setIsAuthorized(hasAdminRole);
      }
    } catch (error) {
      console.error('Error checking admin access:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Checking permissions...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-300">You don't have admin privileges to access this area.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'servers' as AdminTab, name: 'Server Management', icon: '🖥️' },
    { id: 'users' as AdminTab, name: 'User Management', icon: '👥' },
    { id: 'nodes' as AdminTab, name: 'Node Monitoring', icon: '🏗️' },
    { id: 'tunnels' as AdminTab, name: 'Tunnel Management', icon: '🌐' },
    { id: 'diagnostics' as AdminTab, name: 'System Diagnostics', icon: '🔧' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'servers':
        return <ServerManagement />;
      case 'users':
        return <UserManagement />;
      case 'nodes':
        return <NodeMonitoring />;
      case 'tunnels':
        return <TunnelManagement />;
      case 'diagnostics':
        return <SystemDiagnostics />;
      default:
        return <ServerManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-slate-400">
            System administration and server management
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 mb-6">
          <div className="flex flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400 bg-slate-700/50'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-700/30'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
