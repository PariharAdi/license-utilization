import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Database, TrendingUp } from "lucide-react";
import { OrgOverview } from "../types";
import { DashboardService } from "../services/dashboardService";

interface TopObjectsProps {
  overview?: OrgOverview;
}

export const TopObjects: React.FC<TopObjectsProps> = ({ overview }) => {
  const [topObjects, setTopObjects] = useState<Array<{
    name: string;
    usage: number;
  }> | null>(overview?.topObjects || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Always attempt to fetch the canonical top-objects from the backend.
    // If that fails, fall back to `overview.topObjects` when available.
    let cancelled = false;
    setLoading(true);
    DashboardService.getObjectUsage()
      .then((list) => {
        if (cancelled) return;
        setTopObjects(list || []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err?.message || String(err);
        console.warn(
          "Failed to fetch top-objects from backend, falling back to overview:",
          message
        );
        setError(message);
        if (overview && overview.topObjects) {
          setTopObjects(overview.topObjects);
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [overview]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Most Used Objects
          </h3>
        </div>
        <p className="text-sm text-gray-600">Loading top objects…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Most Used Objects
          </h3>
        </div>
        <p className="text-sm text-red-600">
          Failed to load top objects: {error}
        </p>
      </div>
    );
  }

  const objects = topObjects || overview?.topObjects || [];
  if (objects.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Most Used Objects
          </h3>
        </div>
        <p className="text-sm text-gray-600">No object usage data available.</p>
      </div>
    );
  }

  const maxUsage = Math.max(...(objects.map((obj) => obj?.usage || 0) || [0]));

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Most Used Objects
        </h3>
        <TrendingUp className="w-4 h-4 text-green-500" />
      </div>

      <div className="space-y-4">
        {objects.map((object, index) => {
          const percentage = Math.round((object.usage / (maxUsage || 1)) * 100);

          return (
            <Link
              key={index}
              to={`/object/${object.name}`}
              className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <span className="text-sm font-bold text-blue-600">
                  #{index + 1}
                </span>
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                    {object.name}
                  </h4>
                  <span className="text-sm font-semibold text-gray-700">
                    {object.usage?.toLocaleString() || "0"}
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
          Total object interactions in the last 90 days:{" "}
          <span className="font-semibold text-gray-900">
            {objects
              .reduce((sum, obj) => sum + (obj?.usage || 0), 0)
              ?.toLocaleString() || "0"}
          </span>
        </p>
      </div>
    </div>
  );
};
