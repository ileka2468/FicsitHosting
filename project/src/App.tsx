import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { ConfigurationPanel } from './components/ConfigurationPanel';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import { CostCalculator } from './components/CostCalculator';
import { ServerPresets } from './components/ServerPresets';
import { QuickStartGuide } from './components/QuickStartGuide';
import { ConfigurationExport } from './components/ConfigurationExport';
import { PricingSection } from './components/PricingSection';
import { Footer } from './components/Footer';
import { AuthPage } from './components/AuthPage';
import { EmailVerification } from './components/EmailVerification';
import { MyServers } from './components/MyServers';
import { ServerConfig, PresetConfig, User } from './types';
import { UserInfo } from './services/authService';
import { calculatePerformanceMetrics, calculateCost } from './utils/calculations';

function App() {
  const [currentSection, setCurrentSection] = useState<'home' | 'configurator' | 'pricing' | 'servers'>('home');
  const [config, setConfig] = useState<ServerConfig>({
    ram: 6,
    cpu: 3,
    serverSize: 'standard',
    maxPlayers: 8,
    storage: 80,
    backupFrequency: 'daily',
    serverLocation: 'us-east'
  });

  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [emailVerificationComplete, setEmailVerificationComplete] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState(
    calculatePerformanceMetrics(config)
  );
  const [monthlyCost, setMonthlyCost] = useState(calculateCost(config));

  useEffect(() => {
    setPerformanceMetrics(calculatePerformanceMetrics(config));
    setMonthlyCost(calculateCost(config));
  }, [config]);

  // Check for email verification token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const action = urlParams.get('action');
    const pathname = window.location.pathname;

    // Handle /api/auth/verify-email path or home page with verify-email action (do not change this to /auth/verify-email)
    if (token && (pathname === '/api/auth/verify-email' || action === 'verify-email')) {
      setVerificationToken(token);
      setShowEmailVerification(true);
      // Clean URL without triggering page reload
      window.history.replaceState({}, document.title, '/');
    }
  }, []);

  // Check for existing authentication on app startup
  useEffect(() => {
    const checkExistingAuth = async () => {
      const token = localStorage.getItem('satisfactory_auth_token');
      if (token) {
        try {
          // Validate the existing token by making a test API call
          const response = await fetch('/api/auth/validate', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            const userInfo = await response.json();
            console.log('Valid existing token found, logging in user:', userInfo);
            handleLogin(userInfo);
          } else {
            // Token is invalid, remove it
            console.log('Invalid token found, removing it');
            localStorage.removeItem('satisfactory_auth_token');
            localStorage.removeItem('satisfactory_refresh_token');
          }
        } catch (error) {
          console.error('Error validating existing token:', error);
          // Remove invalid tokens
          localStorage.removeItem('satisfactory_auth_token');
          localStorage.removeItem('satisfactory_refresh_token');
        }
      }
    };
    
    checkExistingAuth();
  }, []);

  const handleConfigChange = (newConfig: Partial<ServerConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handlePresetSelect = (preset: PresetConfig) => {
    setConfig(preset.config);
  };

  const handleGetStarted = () => {
    setCurrentSection('configurator');
  };

  const handlePlanSelected = (planConfig: ServerConfig) => {
    setConfig(planConfig);
  };

  const handleViewPricing = () => {
    setCurrentSection('pricing');
  };

  const handleLogin = (userInfo: UserInfo) => {
    console.log('handleLogin called with:', userInfo);
    // Convert UserInfo to User format
    const userData: User = {
      id: userInfo.id.toString(),
      name: userInfo.firstName && userInfo.lastName 
        ? `${userInfo.firstName} ${userInfo.lastName}` 
        : userInfo.username,
      email: userInfo.email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.firstName || userInfo.username)}&background=06b6d4&color=fff`,
      plan: 'free', // Default plan for new users
      servers: []
    };
    console.log('Setting user data:', userData);
    setUser(userData);
    setShowAuthPage(false);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleEmailVerificationClose = () => {
    setShowEmailVerification(false);
    setVerificationToken(null);
  };

  const handleEmailVerificationLoginRedirect = () => {
    setShowEmailVerification(false);
    setVerificationToken(null);
    setShowAuthPage(true);
  };

  const handleEmailVerificationComplete = () => {
    setEmailVerificationComplete(true);
    // Modal will auto-close itself after successful verification
  };

  const renderContent = () => {
    switch (currentSection) {
      case 'home':
        return (
          <>
            <Hero onGetStarted={handleGetStarted} onViewPricing={handleViewPricing} />
            <Features />
          </>
        );
      case 'configurator':
        return (
          <main className="container mx-auto px-2 lg:px-4 py-4 lg:py-6 max-w-none">
            {/* Mobile layout - stacked */}
            <div className="block lg:hidden space-y-4">
              <ServerPresets onPresetSelect={handlePresetSelect} />
              <ConfigurationPanel 
                config={config} 
                onConfigChange={handleConfigChange}
                performanceMetrics={performanceMetrics}
              />
              <CostCalculator 
                config={config} 
                monthlyCost={monthlyCost}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PerformanceMetrics 
                  metrics={performanceMetrics}
                  config={config}
                />
                <ConfigurationExport config={config} />
              </div>
            </div>

            {/* Desktop layout - grid */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-12 gap-3 xl:gap-4 items-start">
                {/* Presets Sidebar */}
                <div className="col-span-3">
                  <ServerPresets onPresetSelect={handlePresetSelect} />
                </div>
                
                {/* Main Configuration Panel */}
                <div className="col-span-6">
                  <ConfigurationPanel 
                    config={config} 
                    onConfigChange={handleConfigChange}
                    performanceMetrics={performanceMetrics}
                  />
                </div>
                
                {/* Cost Calculator Sidebar */}
                <div className="col-span-3">
                  <CostCalculator 
                    config={config} 
                    monthlyCost={monthlyCost}
                  />
                </div>
              </div>
              
              {/* Bottom section - Metrics and Export */}
              <div className="mt-4 lg:mt-6 grid grid-cols-1 xl:grid-cols-2 gap-3 xl:gap-4">
                <PerformanceMetrics 
                  metrics={performanceMetrics}
                  config={config}
                />
                <ConfigurationExport config={config} />
              </div>
            </div>
          </main>
        );
      case 'pricing':
        return <PricingSection onGetStarted={handleGetStarted} onPlanSelected={handlePlanSelected} />;
      case 'servers':
        return <MyServers onCreateServer={handleGetStarted} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dark Glassmorphism Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
        
        {/* Floating Glass Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      {/* Content */}
      <div className={`relative z-10 transition-all duration-300 ${isUserMenuOpen ? 'blur-sm' : ''}`}>
        <Navbar 
          currentSection={currentSection} 
          onSectionChange={setCurrentSection}
          onQuickStart={() => setShowQuickStart(true)}
          user={user}
          onLogin={() => setShowAuthPage(true)}
          onLogout={handleLogout}
          onUserMenuToggle={setIsUserMenuOpen}
        />
        
        {renderContent()}

        <Footer />
      </div>

      {/* Modals - outside the blur container */}
      <div className="relative z-20">
        {showQuickStart && (
          <QuickStartGuide 
            onClose={() => setShowQuickStart(false)}
            onPresetSelect={handlePresetSelect}
          />
        )}

        {showAuthPage && (
          <AuthPage 
            onLogin={handleLogin}
            onClose={() => setShowAuthPage(false)}
            onEmailVerified={emailVerificationComplete ? () => {
              setEmailVerificationComplete(false);
            } : undefined}
          />
        )}

        {showEmailVerification && verificationToken && (
          <EmailVerification
            token={verificationToken}
            onClose={handleEmailVerificationClose}
            onLoginRedirect={handleEmailVerificationLoginRedirect}
            onVerificationComplete={handleEmailVerificationComplete}
            onAutoLogin={handleLogin}
          />
        )}
      </div>
    </div>
  );
}

export default App;