import React, { useState } from 'react';
import { Server, Menu, X, LogIn } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { AuthServiceStatus } from './AuthServiceStatus';
import { User } from '../types';

interface NavbarProps {
  currentSection: 'home' | 'configurator' | 'pricing' | 'servers' | 'admin';
  onSectionChange: (section: 'home' | 'configurator' | 'pricing' | 'servers' | 'admin') => void;
  onQuickStart: () => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onUserMenuToggle: (isOpen: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentSection, 
  onSectionChange, 
  onQuickStart,
  user,
  onLogin,
  onLogout,
  onUserMenuToggle
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'configurator', label: 'Configurator' },
    { id: 'pricing', label: 'Pricing' },
    ...(user ? [{ id: 'servers', label: 'My Servers' }] : [])
  ] as const;

  return (
    <nav className="backdrop-blur-2xl bg-white/15 border-b border-white/30 sticky top-0 z-[105] shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center h-16">
          {/* Logo - Fixed width to balance the layout */}
          <div className="flex-shrink-0 w-72">
            <button
              onClick={() => onSectionChange('home')}
              className="flex items-center space-x-3 hover:opacity-80 transition-all duration-300 group"
            >
              <div className="bg-gradient-to-r from-cyan-400 to-blue-500 p-2 rounded-xl shadow-lg group-hover:shadow-cyan-400/25 transition-all duration-300">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">FicsitHosting</h1>
                <p className="text-white/70 text-xs">Satisfactory Server Hosting</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation - Centered */}
          <div className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-8">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSectionChange(item.id as 'home' | 'configurator' | 'pricing' | 'servers' | 'admin')}
                  className={`text-sm font-medium transition-all duration-300 px-4 py-2 rounded-lg ${
                    currentSection === item.id
                      ? 'text-cyan-400 bg-white/20 backdrop-blur-sm shadow-lg'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop CTA - Flexible width to accommodate buttons */}
          <div className="hidden md:flex items-center justify-end space-x-3 flex-shrink-0 min-w-fit">
            <AuthServiceStatus />
            <button
              onClick={onQuickStart}
              className="text-white/90 hover:text-white text-sm transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/10 whitespace-nowrap"
            >
            Quick Start
          </button>
            
            {user ? (
              <UserMenu 
                user={user} 
                onLogout={onLogout} 
                onSectionChange={onSectionChange}
                onMenuToggle={onUserMenuToggle}
              />
            ) : (
              <>
                <button
                  onClick={onLogin}
                  className="text-white/90 hover:text-white text-sm transition-all duration-300 px-3 py-2 rounded-lg hover:bg-white/10 flex items-center space-x-2 whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onSectionChange('configurator')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-cyan-400/25 backdrop-blur-sm whitespace-nowrap"
                >
                  Get Started
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white/80 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-white/30 backdrop-blur-xl bg-white/10">
            <div className="space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id as 'home' | 'configurator' | 'pricing' | 'servers' | 'admin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`block w-full text-left text-sm font-medium transition-all duration-300 px-4 py-2 rounded-lg ${
                    currentSection === item.id
                      ? 'text-cyan-400 bg-white/20'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="pt-4 space-y-3">
                <button
                  onClick={() => {
                    onQuickStart();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-white/90 hover:text-white text-sm transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
                >
                  Quick Start
                </button>
                {user ? (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 px-4 py-2">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=06b6d4&color=fff`}
                        alt={user.name}
                        className="w-8 h-8 rounded-full border-2 border-white/20"
                      />
                      <div>
                        <p className="text-white font-medium text-sm">{user.name}</p>
                        <p className="text-white/60 text-xs capitalize">{user.plan} Plan</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-red-400 hover:text-red-300 text-sm transition-colors px-4 py-2 rounded-lg hover:bg-red-500/10"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full text-left text-white/90 hover:text-white text-sm transition-colors px-4 py-2 rounded-lg hover:bg-white/10 flex items-center space-x-2"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Sign In</span>
                    </button>
                    <button
                      onClick={() => {
                        onSectionChange('configurator');
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 shadow-lg"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};