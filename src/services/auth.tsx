import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { authApi, wsManager, ApiError } from './api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login(username, password);
      setUser(response.user);
      
      // Connect WebSocket after successful login
      wsManager.connect();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await authApi.register(username, email, password);
      // Note: After registration, user typically needs to log in separately
      // or the backend could auto-login them
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setError(null);
      
      await authApi.logout();
      setUser(null);
      
      // Disconnect WebSocket on logout
      wsManager.disconnect();
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Logout failed';
      setError(errorMessage);
      console.error('Logout error:', err);
    }
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      setLoading(true);
      
      if (authApi.isAuthenticated()) {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        
        // Connect WebSocket if user is authenticated
        wsManager.connect();
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      // Clear invalid tokens
      await authApi.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Set up WebSocket event handlers for auth-related events
  useEffect(() => {
    const unsubscribeAuthExpired = wsManager.subscribe('auth_expired', () => {
      setUser(null);
      setError('Your session has expired. Please log in again.');
    });

    const unsubscribeAuthError = wsManager.subscribe('auth_error', (data: any) => {
      setError(data.message || 'Authentication error occurred');
    });

    return () => {
      unsubscribeAuthExpired();
      unsubscribeAuthError();
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Standalone hook for authentication without context (useful for non-React contexts)
export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login(username, password);
      setUser(response.user);
      
      wsManager.connect();
      return response;
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setUser(null);
      wsManager.disconnect();
    } catch (err) {
      console.error('Logout error:', err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      if (authApi.isAuthenticated()) {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        wsManager.connect();
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setUser(null);
      await authApi.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
    checkAuth,
  };
};
