import { User } from '../types';

export const exportToCSV = (users: User[], filename: string = 'salesforce-license-usage.csv') => {
  const headers = [
    'Name',
    'Email',
    'Profile',
    'Role',
    'License Type',
    'Last Login',
    'Usage Level',
    'Reports Run',
    'Dashboard Views',
    'Tab Hits',
    'Page Views',
    'Account Touches',
    'Contact Touches',
    'Opportunity Touches',
    'Lead Touches',
    'Case Touches'
  ];

  const csvContent = [
    headers.join(','),
    ...users.map(user => [
      `"${user.name}"`,
      `"${user.email}"`,
      `"${user.profile}"`,
      `"${user.role}"`,
      user.licenseType,
      new Date(user.lastLogin).toLocaleDateString(),
      user.usageLevel,
      user.reportsRun,
      user.dashboardViews,
      user.tabHits,
      user.pageViews,
      user.objectTouches.Account || 0,
      user.objectTouches.Contact || 0,
      user.objectTouches.Opportunity || 0,
      user.objectTouches.Lead || 0,
      user.objectTouches.Case || 0
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};