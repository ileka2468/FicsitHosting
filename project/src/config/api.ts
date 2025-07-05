// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

export const API_ENDPOINTS = {
  auth: {
    signin: `${API_BASE_URL}/api/auth/signin`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    refresh: `${API_BASE_URL}/api/auth/refresh`,
    logout: `${API_BASE_URL}/api/auth/logout`,
    validate: `${API_BASE_URL}/api/auth/validate`,
    health: `${API_BASE_URL}/api/auth/health`,
    verifyEmail: `${API_BASE_URL}/api/auth/verify-email`,
    resendVerification: `${API_BASE_URL}/api/auth/resend-verification`,
  }
} as const;

export { API_BASE_URL };
