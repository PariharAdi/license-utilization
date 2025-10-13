import React from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Database,
  Award,
} from "lucide-react";
import { OrgOverview } from "../types";

interface OverviewTilesProps {
  overview: OrgOverview;
}

export const OverviewTiles: React.FC<OverviewTilesProps> = ({ overview }) => {
  if (!overview) {
    return <div className="p-6 text-gray-500">Loading overview data...</div>;
  }

  const utilizationPercentage =
    overview.totalUsers > 0
      ? Math.round((overview.activeUsers / overview.totalUsers) * 100)
      : 0;

  const tiles = [
    {
      title: "Total Users",
      value: overview.totalUsers?.toLocaleString() || "0",
      icon: Users,
      color: "bg-blue-500",
      change: "+5.2%",
      changeType: "positive" as const,
      link: "/users/all?value=all",
    },
    {
      title: "Active Users",
      value: overview.activeUsers?.toLocaleString() || "0",
      icon: UserCheck,
      color: "bg-green-500",
      subtitle: `${utilizationPercentage}% utilization`,
      link: "/users/usage-level?value=Heavy",
    },
    {
      title: "Heavy Users",
      value: overview.heavyUsers?.toLocaleString() || "0",
      icon: TrendingUp,
      color: "bg-purple-500",
      subtitle: `${Math.round(
        ((overview.heavyUsers || 0) / (overview.totalUsers || 1)) * 100
      )}% of total`,
      link: "/users/usage-level?value=Heavy",
    },
    {
      title: "Inactive Users",
      value: overview.inactiveUsers?.toLocaleString() || "0",
      icon: AlertTriangle,
      color: "bg-red-500",
      subtitle: "Potential savings opportunity",
      link: "/users/usage-level?value=Inactive",
    },
    {
      title: "Top Object",
      value: overview.topObjects?.[0]?.name || "N/A",
      icon: Database,
      color: "bg-indigo-500",
      subtitle: `${
        overview.topObjects?.[0]?.usage?.toLocaleString() || "0"
      } touches`,
      link: `/object/${overview.topObjects?.[0]?.name || "Account"}`,
    },
    {
      title: "License Efficiency",
      value: `${Math.round(
        ((overview.licenseUtilization?.full?.used || 0) /
          (overview.licenseUtilization?.full?.total || 1)) *
          100
      )}%`,
      icon: Award,
      color: "bg-orange-500",
      subtitle: "Full license utilization",
      link: "/users/license-type?value=Full",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
      {tiles.map((tile, index) => (
        <Link
          key={index}
          to={tile.link || "#"}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 hover:scale-105 block"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${tile.color}`}>
              <tile.icon className="w-6 h-6 text-white" />
            </div>
            {tile.change && (
              <span
                className={`text-sm font-medium ${
                  tile.changeType === "positive"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {tile.change}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {tile.title}
            </h3>
            <p className="text-2xl font-bold text-gray-900 mb-1">
              {tile.value}
            </p>
            {tile.subtitle && (
              <p className="text-sm text-gray-500">{tile.subtitle}</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};
