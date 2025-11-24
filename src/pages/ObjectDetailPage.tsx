import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Database,
  Users,
  TrendingUp,
  Calendar,
  User,
} from "lucide-react";
import { ObjectUsageDetail } from "../types";
import { mockObjectDetails } from "../data/mockDetailData";

export const ObjectDetailPage: React.FC = () => {
  const { objectName } = useParams<{ objectName: string }>();
  const [objectDetail, setObjectDetail] = useState<ObjectUsageDetail | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // For now, use mock data. In production, this would fetch from backend
    // Example: GET /api/analytics/objects/:objectName
    const loadObjectDetail = async () => {
      try {
        setLoading(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 300));
        const detail = mockObjectDetails.find(
          (obj) => obj.objectName === objectName
        );
        if (!detail) {
          // Generate fallback data for any object
          setObjectDetail({
            objectName: objectName || "Unknown",
            totalInteractions: Math.floor(Math.random() * 3000) + 500,
            uniqueUsers: Math.floor(Math.random() * 50) + 10,
            userBreakdown: [],
            timelineData: Array.from({ length: 5 }, (_, i) => ({
              date: new Date(
                Date.now() - (4 - i) * 24 * 60 * 60 * 1000
              ).toISOString(),
              interactions: Math.floor(Math.random() * 100) + 20,
            })),
          });
        } else {
          setObjectDetail(detail);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load object details"
        );
      } finally {
        setLoading(false);
      }
    };

    loadObjectDetail();
  }, [objectName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Error Loading Object
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!objectDetail) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Object Not Found
          </h2>
          <Link to="/" className="text-blue-600 hover:text-blue-700">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const maxInteractions =
    objectDetail.userBreakdown.length > 0
      ? Math.max(...objectDetail.userBreakdown.map((user) => user.interactions))
      : 1;

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
              <h1 className="text-3xl font-bold text-gray-900">
                {objectDetail.objectName} Object
              </h1>
              <p className="text-lg text-gray-600">
                Detailed usage analytics and user interactions
              </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Interactions
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  Unique Users
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {objectDetail.uniqueUsers}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg. Interactions/User
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(
                    objectDetail.totalInteractions / objectDetail.uniqueUsers
                  )}
                </p>
              </div>
              <Database className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Usage Timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Usage Timeline (Last 5 Days)
          </h3>
          <div className="space-y-4">
            {objectDetail.timelineData.map((day, index) => {
              const percentage =
                (day.interactions /
                  Math.max(
                    ...objectDetail.timelineData.map((d) => d.interactions)
                  )) *
                100;
              return (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-20 text-sm font-medium text-gray-700">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Top Users
          </h3>
          {objectDetail.userBreakdown.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No user breakdown data available for this object yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {objectDetail.userBreakdown.map((user, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
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
                          <span>
                            Last access:{" "}
                            {new Date(user.lastAccess).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {user.interactions.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">interactions</p>
                    </div>
                  </div>

                  {/* Usage bar */}
                  <div className="mb-4">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            (user.interactions / maxInteractions) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Action breakdown */}
                  <div className="grid grid-cols-5 gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-gray-600 mb-1">Create</p>
                      <p className="font-semibold text-blue-600">
                        {user.actionTypes.CREATE}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 mb-1">Read</p>
                      <p className="font-semibold text-green-600">
                        {user.actionTypes.READ}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 mb-1">Update</p>
                      <p className="font-semibold text-yellow-600">
                        {user.actionTypes.UPDATE}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 mb-1">Delete</p>
                      <p className="font-semibold text-red-600">
                        {user.actionTypes.DELETE}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-600 mb-1">View</p>
                      <p className="font-semibold text-purple-600">
                        {user.actionTypes.VIEW}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
