import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Database, Users, TrendingUp, Calendar, User } from 'lucide-react';
import { mockObjectDetails } from '../data/mockDetailData';

export const ObjectDetailPage: React.FC = () => {
  const { objectName } = useParams<{ objectName: string }>();
  const objectDetail = mockObjectDetails.find(obj => obj.objectName === objectName);

  if (!objectDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Object Not Found</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const maxInteractions = Math.max(...objectDetail.userBreakdown.map(user => user.interactions));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Database className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{objectDetail.objectName} Object</h1>
              <p className="text-lg text-gray-600">Detailed usage analytics and user interactions</p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Interactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {objectDetail.totalInteractions.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold text-gray-900">{objectDetail.uniqueUsers}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Interactions/User</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(objectDetail.totalInteractions / objectDetail.uniqueUsers)}
                </p>
              </div>
              <Database className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Usage Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Usage Timeline (Last 5 Days)</h3>
          <div className="space-y-4">
            {objectDetail.timelineData.map((day, index) => {
              const percentage = (day.interactions / Math.max(...objectDetail.timelineData.map(d => d.interactions))) * 100;
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium text-gray-700">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1">
                    <div className="bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-sm font-semibold text-gray-900 text-right">
                    {day.interactions}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* User Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Users</h3>
          <div className="space-y-4">
            {objectDetail.userBreakdown.map((user, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                    <div>
                      <Link 
                        to={`/user/${user.userId}`}
                        className="text-lg font-medium text-blue-600 hover:text-blue-700"
                      >
                        {user.userName}
                      </Link>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>Last access: {new Date(user.lastAccess).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{user.interactions.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">interactions</p>
                  </div>
                </div>

                {/* Usage bar */}
                <div className="mb-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(user.interactions / maxInteractions) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action breakdown */}
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">Create</p>
                    <p className="font-semibold text-blue-600">{user.actionTypes.CREATE}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">Read</p>
                    <p className="font-semibold text-green-600">{user.actionTypes.READ}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">Update</p>
                    <p className="font-semibold text-yellow-600">{user.actionTypes.UPDATE}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">Delete</p>
                    <p className="font-semibold text-red-600">{user.actionTypes.DELETE}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 mb-1">View</p>
                    <p className="font-semibold text-purple-600">{user.actionTypes.VIEW}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};