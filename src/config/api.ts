// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  // Authentication
  auth: {
    salesforce: '/api/auth/salesforce',
    callback: '/api/auth/salesforce/callback',
    me: '/api/auth/me',
    status: '/api/auth/status',
    refresh: '/api/auth/refresh',
    logout: '/api/auth/logout',
  },

  // Users
  users: {
    list: '/api/users',
    summary: '/api/users/summary',
    filters: '/api/users/filters',
    export: '/api/users/export',
    detail: (userId: string) => `/api/users/${userId}`,
  },

  // Analytics
  analytics: {
    overview: '/api/analytics/overview',
    topObjects: '/api/analytics/top-objects',
    licenseUtilization: '/api/analytics/license-utilization',
    licenses: '/api/analytics/license-utilization',
    userActivity: (userId: string) => `/api/analytics/users/${userId}/activity`,
  },
} as const;

// API Request Configuration
export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' as RequestCredentials, // Include cookies for auth
};