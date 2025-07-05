import { API_ENDPOINTS } from '../config/api';

export interface LoginRequest {
  usernameOrEmail: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  enabled: boolean;
  roles: any[]; // Can be Role objects or strings, we'll handle both
  createdAt: string;
  lastLoginAt?: string;
}

export interface Role {
  name?: string;
  // Role might be just a string or an object, we'll handle both
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage on initialization
    this.accessToken = localStorage.getItem('satisfactory_auth_token');
    this.refreshToken = localStorage.getItem('satisfactory_refresh_token');
  }

  async login(loginRequest: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.signin, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginRequest),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
        } catch (e) {
          errorMessage = `Server error: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const authResponse: AuthResponse = await response.json();
      
      // Store tokens
      this.setTokens(authResponse.accessToken, authResponse.refreshToken);
      
      return authResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(registerRequest: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.signup, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerRequest),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || `Server error: ${response.status}`;
        } catch (e) {
          errorMessage = `Server error: ${response.status} - ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const authResponse: AuthResponse = await response.json();
      
      // Store tokens
      this.setTokens(authResponse.accessToken, authResponse.refreshToken);
      
      return authResponse;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async refreshAccessToken(): Promise<AuthResponse> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(API_ENDPOINTS.auth.refresh, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        // Refresh token is invalid, clear tokens
        this.clearTokens();
        throw new Error('Token refresh failed');
      }

      const authResponse: AuthResponse = await response.json();
      this.setTokens(authResponse.accessToken, authResponse.refreshToken);
      
      return authResponse;
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await fetch(API_ENDPOINTS.auth.logout, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    
    this.clearTokens();
  }

  async validateToken(): Promise<UserInfo | null> {
    if (!this.accessToken) {
      return null;
    }

    try {
      const response = await fetch(API_ENDPOINTS.auth.validate, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        // Token is invalid, try to refresh
        if (this.refreshToken) {
          try {
            await this.refreshAccessToken();
            return this.validateToken(); // Retry with new token
          } catch {
            this.clearTokens();
            return null;
          }
        }
        this.clearTokens();
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINTS.auth.health);
      return response.ok;
    } catch {
      return false;
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('satisfactory_auth_token', accessToken);
    localStorage.setItem('satisfactory_refresh_token', refreshToken);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('satisfactory_auth_token');
    localStorage.removeItem('satisfactory_refresh_token');
    // Also remove any legacy tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Helper method for making authenticated requests
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('No access token available');
    }

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If unauthorized, try to refresh token and retry
    if (response.status === 401 && this.refreshToken) {
      try {
        await this.refreshAccessToken();
        response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            'Authorization': `Bearer ${this.accessToken}`,
          },
        });
      } catch {
        this.clearTokens();
        throw new Error('Authentication failed');
      }
    }

    return response;
  }
}

// Export a singleton instance
export const authService = new AuthService();
export default authService;
