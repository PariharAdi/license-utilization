export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  status: string;
  license: string;
  profile: string;
  role: string;
  lastLogin: string;
  loginCount: number;
  objectsAccessed: number;
  favoriteObject?: string;
  licenseType?: string;
  usageLevel?: string;
  reportsRun?: number;
  tabHits?: number;
  dashboardViews?: number;
  pageViews?: number;
  objectTouches?: Record<string, number>;
}

export interface SalesforceUser {
  Id: string;
  Name: string;
  Username: string;
  Email: string;
  IsActive: boolean;
  ProfileId: string;
  Profile: {
    Name: string;
  };
  UserRole: {
    Name: string;
  } | null;
}

export interface UserActivity {
  date: string;
  logins: number;
  objectsAccessed: number;
}

export interface ObjectAccess {
  objectName: string;
  accessCount: number;
  lastAccessed: string;
}

export interface FilterOptions {
  profile?: string[];
  licenseType?: string[];
  usageLevel?: string[];
  licenses: string[];
  profiles: string[];
  roles: string[];
  statuses: string[];
}

export interface UserSummary {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  utilizationRate: number;
  licenseDistribution: Record<string, number>;
}

export interface AnalyticsData {
  overview: {
    totalLicenses: number;
    usedLicenses: number;
    unusedLicenses: number;
    utilizationRate: number;
  };
  licenseTypes: Array<{
    name: string;
    total: number;
    used: number;
    available: number;
  }>;
  topObjects: Array<{
    name: string;
    accessCount: number;
    uniqueUsers: number;
  }>;
}

export interface OrgOverview {
  totalUsers: number;
  activeUsers: number;
  heavyUsers: number;
  mediumUsers: number;
  lightUsers: number;
  inactiveUsers: number;
  topObjects: Array<{
    name: string;
    usage: number;
  }>;
  licenseUtilization: {
    full: { total: number; used: number };
    platform: { total: number; used: number };
    community: { total: number; used: number };
  };
}

export interface ObjectUsageDetail {
  objectName: string;
  totalInteractions: number;
  uniqueUsers: number;
  userBreakdown: Array<{
    userId: string;
    userName: string;
    interactions: number;
    lastAccess: string;
    actionTypes: {
      CREATE: number;
      READ: number;
      UPDATE: number;
      DELETE: number;
      VIEW: number;
    };
  }>;
  timelineData: Array<{
    date: string;
    interactions: number;
  }>;
}

export interface DetailedUserMetrics extends User {
  activityTimeline: Array<{
    date: string;
    objectTouches: number;
    reportsRun: number;
    dashboardViews: number;
    loginCount: number;
  }>;
  recentActivities: Array<{
    id: string;
    userId: string;
    objectName: string;
    actionType: string;
    timestamp: string;
    recordId: string;
    sessionId: string;
  }>;
  objectUsageBreakdown: Array<{
    objectName: string;
    totalTouches: number;
    actionBreakdown: {
      CREATE: number;
      READ: number;
      UPDATE: number;
      DELETE: number;
      VIEW: number;
    };
    trend: 'up' | 'down' | 'stable';
  }>;
}