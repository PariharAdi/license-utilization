export interface User {
  id: string;
  name: string;
  email: string;
  profile: string;
  role: string;
  lastLogin: string;
  licenseType: 'Full' | 'Platform' | 'Community';
  usageLevel: 'Heavy' | 'Medium' | 'Light' | 'Inactive';
  objectTouches: {
    [objectName: string]: number;
  };
  reportsRun: number;
  dashboardViews: number;
  tabHits: number;
  pageViews: number;
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

export interface FilterOptions {
  profile: string[];
  role: string[];
  licenseType: string[];
  usageLevel: string[];
  dateRange: '90' | '180' | '365';
}

export interface UsageMetrics {
  period: string;
  objectUsage: { [key: string]: number };
  reportRuns: number;
  dashboardViews: number;
  loginCount: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  objectName: string;
  actionType: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'VIEW';
  timestamp: string;
  recordId?: string;
  sessionId: string;
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
  recentActivities: UserActivity[];
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