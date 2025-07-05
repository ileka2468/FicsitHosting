import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AuthServiceStatus: React.FC = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthy = await authService.checkHealth();
        setIsHealthy(healthy);
      } catch (error) {
        setIsHealthy(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();
  }, []);

  return (
    <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
      isLoading 
        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
        : isHealthy 
          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
          : 'bg-red-500/20 text-red-300 border border-red-500/30'
    }`}>
       Service Status: {
        isLoading 
          ? 'Checking...' 
          : isHealthy 
            ? 'No issues' 
            : 'Offline'
      }
    </div>
  );
};
