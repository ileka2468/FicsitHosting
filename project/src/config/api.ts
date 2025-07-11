// API Configuration

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || 'http://auth-service:8081';
const ORCHESTRATOR_BASE_URL = import.meta.env.VITE_ORCHESTRATOR_BASE_URL || 'http://orchestrator:8080/api';

export const API_ENDPOINTS = {
  // Auth Service (port 8081)
  auth: {
    signin: `${AUTH_BASE_URL}/auth/api/auth/signin`,
    signup: `${AUTH_BASE_URL}/auth/api/auth/signup`,
    refresh: `${AUTH_BASE_URL}/auth/api/auth/refresh`,
    logout: `${AUTH_BASE_URL}/auth/api/auth/logout`,
    validate: `${AUTH_BASE_URL}/auth/api/auth/validate`,
    health: `${AUTH_BASE_URL}/auth/api/auth/health`,
    verifyEmail: `${AUTH_BASE_URL}/auth/api/auth/verify-email`,
    resendVerification: `${AUTH_BASE_URL}/auth/api/auth/resend-verification`,
  }
} as const;

export { AUTH_BASE_URL, ORCHESTRATOR_BASE_URL };

