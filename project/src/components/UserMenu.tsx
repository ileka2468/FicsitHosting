import React, { useState } from 'react';
import { User, Settings, Server, CreditCard, LogOut, ChevronDown, Crown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { User as UserType } from '../types';

interface UserMenuProps {
  user: UserType;
  onLogout: () => void;
  onSectionChange: (section: 'home' | 'configurator' | 'pricing') => void;
  onMenuToggle: (isOpen: boolean) => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout, onSectionChange, onMenuToggle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);

  const handleMenuToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onMenuToggle(newState);
  };

  const handleMenuClose = () => {
    setIsOpen(false);
    onMenuToggle(false);
  };

  // Calculate dropdown position based on button position
  const getDropdownPosition = () => {
    if (!buttonRef) return { top: 0, right: 0 };
    
    const rect = buttonRef.getBoundingClientRect();
    return {
      top: rect.bottom + 12, // 12px gap like mt-3
      right: window.innerWidth - rect.right + 4 // 4px offset like mr-1
    };
  };

  const planColors = {
    free: 'from-gray-400 to-gray-500',
    starter: 'from-green-400 to-emerald-500',
    standard: 'from-cyan-400 to-blue-500',
    premium: 'from-purple-400 to-violet-500',
    enterprise: 'from-orange-400 to-red-500',
    ultimate: 'from-yellow-400 to-amber-500'
  };

  const planIcons = {
    free: null,
    starter: null,
    standard: Crown,
    premium: Crown,
    enterprise: Crown,
    ultimate: Crown
  };

  const PlanIcon = planIcons[user.plan];

  return (
    <div className="relative z-[105]">
      <button
        ref={setButtonRef}
        onClick={handleMenuToggle}
        className="flex items-center space-x-3 backdrop-blur-xl bg-white/15 hover:bg-white/25 border border-white/30 rounded-full pl-2 pr-4 py-2 transition-all duration-300 group"
      >
        {/* Avatar */}
        <div className="relative">
          <img
            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=06b6d4&color=fff`}
            alt={user.name}
            className="w-8 h-8 rounded-full border-2 border-white/20"
          />
          {user.plan !== 'free' && (
            <div className={`absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r ${planColors[user.plan]} rounded-full flex items-center justify-center`}>
              {PlanIcon && <PlanIcon className="w-2 h-2 text-white" />}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="hidden sm:block text-left">
          <p className="text-white font-medium text-sm leading-tight">{user.name}</p>
          <p className="text-white/60 text-xs capitalize">{user.plan} Plan</p>
        </div>

        <ChevronDown className={`w-4 h-4 text-white/70 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu - rendered outside blur using portal */}
      {isOpen && createPortal(
        <div 
          className="fixed w-72 bg-slate-900 border border-white/40 rounded-2xl shadow-2xl z-[120] overflow-hidden ring-1 ring-white/10"
          style={{
            top: getDropdownPosition().top,
            right: getDropdownPosition().right
          }}
        >
            {/* User Info Header */}
            <div className="p-4 border-b border-white/30 bg-black/20">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=06b6d4&color=fff`}
                  alt={user.name}
                  className="w-12 h-12 rounded-full border-2 border-white/20"
                />
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{user.name}</h3>
                  <p className="text-white/60 text-sm">{user.email}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`px-2 py-1 bg-gradient-to-r ${planColors[user.plan]} rounded-full flex items-center space-x-1`}>
                      {PlanIcon && <PlanIcon className="w-3 h-3 text-white" />}
                      <span className="text-white text-xs font-medium capitalize">{user.plan}</span>
                    </div>
                    {user.plan === 'free' && (
                      <button
                        onClick={() => {
                          onSectionChange('pricing');
                          handleMenuClose();
                        }}
                        className="text-cyan-400 hover:text-cyan-300 text-xs transition-colors"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  // Navigate to servers/dashboard
                  handleMenuClose();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/15 transition-all"
              >
                <Server className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">My Servers</p>
                  <p className="text-xs text-white/60">{user.servers.length} active servers</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onSectionChange('configurator');
                  handleMenuClose();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/15 transition-all"
              >
                <Settings className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Server Configurator</p>
                  <p className="text-xs text-white/60">Create new server</p>
                </div>
              </button>

              <button
                onClick={() => {
                  onSectionChange('pricing');
                  handleMenuClose();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/15 transition-all"
              >
                <CreditCard className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Billing & Plans</p>
                  <p className="text-xs text-white/60">Manage subscription</p>
                </div>
              </button>

              <button
                onClick={() => {
                  // Navigate to account settings
                  handleMenuClose();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/15 transition-all"
              >
                <User className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">Account Settings</p>
                  <p className="text-xs text-white/60">Profile & preferences</p>
                </div>
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-white/20 py-2">
              <button
                onClick={() => {
                  onLogout();
                  handleMenuClose();
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>,
        document.body
      )}
    </div>
  );
};
