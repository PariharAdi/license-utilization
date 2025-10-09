import React from 'react';
import { Link } from 'react-router-dom';
import { Database, TrendingUp } from 'lucide-react';
import { OrgOverview } from '../types';

interface TopObjectsProps {
  overview: OrgOverview;
}

export const TopObjects: React.FC<TopObjectsProps> = ({ overview }) => {
  const maxUsage = Math.max(...overview.topObjects.map(obj => obj.usage));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Most Used Objects</h3>
        <TrendingUp className="w-4 h-4 text-green-500" />
      </div>

      <div className="space-y-4">
        {overview.topObjects.map((object, index) => {
          const percentage = Math.round((object.usage / maxUsage) * 100);
          
          return (
            <Link 
              key={index} 
              to={`/object/${object.name}`}
              className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">{object.name}</h4>
                  <span className="text-sm font-semibold text-gray-700">
                    {object.usage.toLocaleString()}
                  </span>
                </div>
                
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Total object interactions in the last 90 days: {' '}
          <span className="font-semibold text-gray-900">
            {overview.topObjects.reduce((sum, obj) => sum + obj.usage, 0).toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  );
};