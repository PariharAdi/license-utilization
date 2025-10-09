import { UserActivity, ObjectUsageDetail, DetailedUserMetrics } from '../types';
import { mockUsers } from './mockData';

// Mock user activities for detailed views
export const mockUserActivities: UserActivity[] = [
  {
    id: '1',
    userId: '1',
    objectName: 'Account',
    actionType: 'READ',
    timestamp: '2024-01-15T10:30:00Z',
    recordId: 'acc_001',
    sessionId: 'sess_001'
  },
  {
    id: '2',
    userId: '1',
    objectName: 'Contact',
    actionType: 'UPDATE',
    timestamp: '2024-01-15T10:25:00Z',
    recordId: 'con_001',
    sessionId: 'sess_001'
  },
  {
    id: '3',
    userId: '2',
    objectName: 'Opportunity',
    actionType: 'CREATE',
    timestamp: '2024-01-14T16:45:00Z',
    recordId: 'opp_001',
    sessionId: 'sess_002'
  }
];

// Mock object usage details
export const mockObjectDetails: ObjectUsageDetail[] = [
  {
    objectName: 'Account',
    totalInteractions: 2456,
    uniqueUsers: 45,
    userBreakdown: [
      {
        userId: '1',
        userName: 'Sarah Johnson',
        interactions: 245,
        lastAccess: '2024-01-15T10:30:00Z',
        actionTypes: {
          CREATE: 12,
          READ: 180,
          UPDATE: 45,
          DELETE: 3,
          VIEW: 5
        }
      },
      {
        userId: '2',
        userName: 'Michael Chen',
        interactions: 198,
        lastAccess: '2024-01-14T16:45:00Z',
        actionTypes: {
          CREATE: 8,
          READ: 150,
          UPDATE: 35,
          DELETE: 2,
          VIEW: 3
        }
      }
    ],
    timelineData: [
      { date: '2024-01-01', interactions: 45 },
      { date: '2024-01-02', interactions: 52 },
      { date: '2024-01-03', interactions: 38 },
      { date: '2024-01-04', interactions: 61 },
      { date: '2024-01-05', interactions: 44 }
    ]
  }
];

// Generate detailed user metrics
export const generateDetailedUserMetrics = (userId: string): DetailedUserMetrics | null => {
  const user = mockUsers.find(u => u.id === userId);
  if (!user) return null;

  return {
    ...user,
    activityTimeline: [
      { date: '2024-01-01', objectTouches: 15, reportsRun: 2, dashboardViews: 5, loginCount: 1 },
      { date: '2024-01-02', objectTouches: 23, reportsRun: 1, dashboardViews: 8, loginCount: 1 },
      { date: '2024-01-03', objectTouches: 18, reportsRun: 3, dashboardViews: 4, loginCount: 1 },
      { date: '2024-01-04', objectTouches: 31, reportsRun: 0, dashboardViews: 12, loginCount: 2 },
      { date: '2024-01-05', objectTouches: 27, reportsRun: 2, dashboardViews: 6, loginCount: 1 }
    ],
    recentActivities: mockUserActivities.filter(activity => activity.userId === userId),
    objectUsageBreakdown: Object.entries(user.objectTouches).map(([objectName, totalTouches]) => ({
      objectName,
      totalTouches,
      actionBreakdown: {
        CREATE: Math.floor(totalTouches * 0.1),
        READ: Math.floor(totalTouches * 0.6),
        UPDATE: Math.floor(totalTouches * 0.25),
        DELETE: Math.floor(totalTouches * 0.02),
        VIEW: Math.floor(totalTouches * 0.03)
      },
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable' as 'up' | 'down' | 'stable'
    }))
  };
};