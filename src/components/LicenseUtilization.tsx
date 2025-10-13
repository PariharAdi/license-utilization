import React from "react";
import { Link } from "react-router-dom";
import { OrgOverview } from "../types";

interface LicenseUtilizationProps {
  overview: OrgOverview;
}

export const LicenseUtilization: React.FC<LicenseUtilizationProps> = ({
  overview,
}) => {
  if (!overview || !overview.licenseUtilization) return null;

  const licenses = [
    {
      type: "Salesforce Full",
      used: overview.licenseUtilization.full?.used || 0,
      total: overview.licenseUtilization.full?.total || 0,
      color: "bg-blue-500",
      cost: "$150/month",
    },
    {
      type: "Platform",
      used: overview.licenseUtilization.platform?.used || 0,
      total: overview.licenseUtilization.platform?.total || 0,
      color: "bg-purple-500",
      cost: "$25/month",
    },
    {
      type: "Community",
      used: overview.licenseUtilization.community?.used || 0,
      total: overview.licenseUtilization.community?.total || 0,
      color: "bg-green-500",
      cost: "$2/month",
    },
  ];

  const totalPotentialSavings = licenses.reduce((acc, license) => {
    const unused = license.total - license.used;
    const monthlyCost = parseInt(license.cost.replace(/[^0-9]/g, "") || "0");
    return acc + unused * monthlyCost;
  }, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          License Utilization
        </h3>
        <div className="text-right">
          <p className="text-sm text-gray-600">Potential Monthly Savings</p>
          <p className="text-xl font-bold text-green-600">
            ${totalPotentialSavings?.toLocaleString() || "0"}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {licenses.map((license, index) => {
          const utilizationPercent = Math.round(
            (license.used / license.total) * 100
          );
          const unused = license.total - license.used;
          const licenseType =
            license.type.split(" ")[license.type.split(" ").length - 1]; // Get last word (Full, Platform, Community)

          return (
            <Link
              key={index}
              to={`/users/license-type?value=${licenseType}`}
              className="block space-y-2 hover:bg-gray-50 p-3 rounded-lg transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{license.type}</h4>
                  <p className="text-sm text-gray-600">
                    {license.cost} per user
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {license.used} / {license.total}
                  </p>
                  <p className="text-sm text-gray-600">
                    {utilizationPercent}% used
                  </p>
                </div>
              </div>

              <div className="bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${license.color} transition-all duration-500`}
                  style={{ width: `${utilizationPercent}%` }}
                />
              </div>

              {unused > 0 && (
                <p className="text-sm text-orange-600">
                  {unused} unused licenses • Potential savings: $
                  {(
                    unused * parseInt(license.cost.replace(/[^0-9]/g, ""))
                  ).toLocaleString()}
                  /month
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
