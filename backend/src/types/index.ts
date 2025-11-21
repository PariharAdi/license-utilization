export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // optional diagnostic fields used in controllers
  details?: any;
  timestamp?: Date;
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  status: 'active' | 'inactive' | string;
  license: string;
  profile: string;
  role: string;
  lastLogin: string;
  loginCount: number;
  objectsAccessed: number;
  organizationId?: string;
  isActive?: boolean;
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

// Common pagination wrapper
export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page?: number;
    limit?: number;
    total: number;
    totalPages?: number;
  };
}

export interface FilterOptions {
  licenses?: string[];
  profiles?: string[];
  roles?: string[];
  statuses?: string[];
  // Singular forms used by some modules
  profile?: string | string[];
  role?: string | string[];
  licenseType?: string | string[];
  isActive?: boolean;
}

export interface Organization {
  id: string;
  orgName?: string;
  salesforceOrgId?: string;
}

export interface JobStats {
  name?: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

export interface JobResult {
  jobId: string;
  status: string;
  result?: any;
}