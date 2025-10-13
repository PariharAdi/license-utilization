export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  license: string;
  profile: string;
  role: string;
  lastLogin: string;
  loginCount: number;
  objectsAccessed: number;
}

export interface SalesforceTokenResponse {
  access_token: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
  signature: string;
}

export interface LicenseUsage {
  type: string;
  total: number;
  used: number;
  available: number;
  utilizationPercentage: number;
}

export interface ObjectUsage {
  name: string;
  apiName: string;
  recordCount: number;
  storageUsed: string;
  lastAccessed: string;
}

export interface UserActivity {
  userId: string;
  username: string;
  loginCount: number;
  lastLogin: string;
  objectsAccessed: string[];
  reportsViewed: number;
  dashboardsViewed: number;
}

export interface AnalyticsData {
  userSummary: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    utilizationRate: number;
  };
  licenseUtilization: LicenseUsage[];
  objectUsage: ObjectUsage[];
  userActivity: UserActivity[];
}