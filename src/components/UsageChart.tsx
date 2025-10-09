import React from 'react';
import { Link } from 'react-router-dom';
import { OrgOverview } from '../types';

interface UsageChartProps {
  overview: OrgOverview;
}

export const UsageChart: React.FC<UsageChartProps> = ({ overview }) => {
  const usageData = [
    { label: 'Heavy Users', value: overview.heavyUsers, color: 'bg-green-500' },
    { label: 'Medium Users', value: overview.mediumUsers, color: 'bg-yellow-500' },
    { label: 'Light Users', value: overview.lightUsers, color: 'bg-orange-500' },
    { label: 'Inactive Users', value: overview.inactiveUsers, color: 'bg-red-500' }
  ];

  const maxValue = Math.max(...usageData.map(d => d.value));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">User Activity Distribution</h3>
      
      <div className="space-y-4">
        {usageData.map((item, index) => (
          <Link 
            key={index} 
            to={`/users/usage-level?value=${item.label.split(' ')[0]}`}
            className="flex items-center hover:bg-gray-50 p-2 rounded-lg transition-colors"
          >
            <div className="w-24 text-sm font-medium text-gray-700">
              {item.label}
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-12 text-sm font-semibold text-gray-900 text-right">
              {item.value}
            </div>
            <div className="w-12 text-xs text-gray-500 text-right">
              {Math.round((item.value / overview.totalUsers) * 100)}%
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Active Users</span>
          <span className="font-semibold text-gray-900">
            {overview.activeUsers} / {overview.totalUsers}
          </span>
        </div>
      </div>
    </div>
  );
};