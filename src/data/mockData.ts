import { User, OrgOverview } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    profile: 'System Administrator',
    role: 'VP Sales',
    lastLogin: '2024-01-15T10:30:00Z',
    licenseType: 'Full',
    usageLevel: 'Heavy',
    objectTouches: {
      'Account': 245,
      'Contact': 189,
      'Opportunity': 156,
      'Lead': 98,
      'Case': 67
    },
    reportsRun: 45,
    dashboardViews: 123,
    tabHits: 892,
    pageViews: 1245
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael.chen@company.com',
    profile: 'Sales User',
    role: 'Account Executive',
    lastLogin: '2024-01-14T16:45:00Z',
    licenseType: 'Full',
    usageLevel: 'Heavy',
    objectTouches: {
      'Account': 198,
      'Contact': 234,
      'Opportunity': 289,
      'Lead': 145,
      'Task': 78
    },
    reportsRun: 23,
    dashboardViews: 89,
    tabHits: 756,
    pageViews: 1089
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@company.com',
    profile: 'Marketing User',
    role: 'Marketing Manager',
    lastLogin: '2024-01-12T09:15:00Z',
    licenseType: 'Full',
    usageLevel: 'Medium',
    objectTouches: {
      'Lead': 167,
      'Campaign': 89,
      'Contact': 123,
      'Account': 45,
      'Opportunity': 34
    },
    reportsRun: 18,
    dashboardViews: 56,
    tabHits: 423,
    pageViews: 678
  },
  {
    id: '4',
    name: 'David Thompson',
    email: 'david.thompson@company.com',
    profile: 'Standard User',
    role: 'Sales Rep',
    lastLogin: '2024-01-10T14:20:00Z',
    licenseType: 'Platform',
    usageLevel: 'Light',
    objectTouches: {
      'Account': 23,
      'Contact': 45,
      'Opportunity': 12,
      'Task': 34
    },
    reportsRun: 5,
    dashboardViews: 12,
    tabHits: 156,
    pageViews: 234
  },
  {
    id: '5',
    name: 'Lisa Wang',
    email: 'lisa.wang@company.com',
    profile: 'Customer Community User',
    role: 'Partner User',
    lastLogin: '2023-12-15T11:30:00Z',
    licenseType: 'Community',
    usageLevel: 'Inactive',
    objectTouches: {
      'Case': 2,
      'Account': 1
    },
    reportsRun: 0,
    dashboardViews: 1,
    tabHits: 8,
    pageViews: 12
  }
];

export const mockOrgOverview: OrgOverview = {
  totalUsers: 125,
  activeUsers: 98,
  heavyUsers: 35,
  mediumUsers: 28,
  lightUsers: 35,
  inactiveUsers: 27,
  topObjects: [
    { name: 'Account', usage: 2456 },
    { name: 'Contact', usage: 1987 },
    { name: 'Opportunity', usage: 1654 },
    { name: 'Lead', usage: 1234 },
    { name: 'Case', usage: 987 }
  ],
  licenseUtilization: {
    full: { total: 100, used: 78 },
    platform: { total: 50, used: 32 },
    community: { total: 200, used: 145 }
  }
};