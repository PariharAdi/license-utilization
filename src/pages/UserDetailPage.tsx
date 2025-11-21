import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, BarChart3, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

export const UserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const userMetrics = userId ? generateDetailedUserMetrics(userId) : null;

  if (!userMetrics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUsageLevelColor = (level: string) => {
    switch (level) {
      case 'Heavy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Light': return 'bg-orange-100 text-orange-800';
      case 'Inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

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
                <User className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{userMetrics.name}</h1>
              <p className="text-lg text-gray-600">{userMetrics.email}</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-gray-500">{userMetrics.profile}</span>
                <span className="text-sm text-gray-500">•</span>
                <span className="text-sm text-gray-500">{userMetrics.role}</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUsageLevelColor(userMetrics.usageLevel)}`}>
                  {userMetrics.usageLevel}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Object Touches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Object.values(userMetrics.objectTouches).reduce((sum, count) => sum + count, 0).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reports Run</p>
                <p className="text-2xl font-bold text-gray-900">{userMetrics.reportsRun}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Dashboard Views</p>
                <p className="text-2xl font-bold text-gray-900">{userMetrics.dashboardViews}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Login</p>
                <p className="text-lg font-bold text-gray-900">
                  {new Date(userMetrics.lastLogin).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Object Usage Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Object Usage Breakdown</h3>
            <div className="space-y-4">
              {userMetrics.objectUsageBreakdown.map((object, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 flex items-center space-x-2">
                      <span>{object.objectName}</span>
                      {getTrendIcon(object.trend)}
                    </h4>
                    <span className="text-lg font-bold text-gray-900">
                      {object.totalTouches.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-gray-600">Create</p>
                      <p className="font-semibold text-blue-600">{object.actionBreakdown.CREATE}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Read</p>
                      <p className="font-semibold text-green-600">{object.actionBreakdown.READ}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Update</p>
                      <p className="font-semibold text-yellow-600">{object.actionBreakdown.UPDATE}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">Delete</p>
                      <p className="font-semibold text-red-600">{object.actionBreakdown.DELETE}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600">View</p>
                      <p className="font-semibold text-purple-600">{object.actionBreakdown.VIEW}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
            <div className="space-y-4">
              {userMetrics.recentActivities.length > 0 ? (
                userMetrics.recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.actionType} on {activity.objectName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recent activities found</p>
              )}
            </div>
          </div>
        </div>

        {/* Activity Timeline Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Activity Timeline (Last 5 Days)</h3>
          <div className="space-y-4">
            {userMetrics.activityTimeline.map((day, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium text-gray-700">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Object Touches</p>
                    <p className="text-sm font-semibold text-blue-600">{day.objectTouches}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Reports</p>
                    <p className="text-sm font-semibold text-green-600">{day.reportsRun}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Dashboards</p>
                    <p className="text-sm font-semibold text-purple-600">{day.dashboardViews}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-600">Logins</p>
                    <p className="text-sm font-semibold text-orange-600">{day.loginCount}</p>
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