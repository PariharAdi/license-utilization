export interface SalesforceUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  organizationId: string;
  organizationName: string;
  profileId: string;
  profileName: string;
  userRoleId?: string;
  userRoleName?: string;
  userType: string;
  isActive: boolean;
  lastLoginDate?: string;
  photoUrl?: string;
}

export interface SalesforceTokens {
  accessToken: string;
  refreshToken?: string;
  instanceUrl: string;
  userId: string;
  organizationId: string;
  expiresAt?: Date;
}

export interface User {
  id: string;
  salesforceUserId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileId?: string;
  profileName?: string;
  userRoleId?: string;
  userRoleName?: string;
  licenseType?: string;
  isActive: boolean;
  lastLogin?: Date;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Organization {
  id: string;
  salesforceOrgId: string;
  orgName: string;
  instanceUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserActivity {
  id: string;
  userId: string;
  organizationId: string;
  activityDate: Date;
  loginCount: number;
  apiRequests: number;
  reportRuns: number;
  dashboardViews: number;
  pageViews: number;
  objectTouches: Record<string, number>;
  createdAt: Date;
}

export interface LicenseSummary {
  id: string;
  organizationId: string;
  date: Date;
  licenseType: string;
  totalLicenses: number;
  usedLicenses: number;
  createdAt: Date;
}

export interface EventLogFile {
  id: string;
  organizationId: string;
  salesforceLogFileId: string;
  eventType: string;
  logDate: Date;
  processed: boolean;
  processedAt?: Date;
  createdAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FilterOptions {
  profile?: string[];
  role?: string[];
  licenseType?: string[];
  usageLevel?: string[];
  dateRange?: '90' | '180' | '365';
  isActive?: boolean;
}