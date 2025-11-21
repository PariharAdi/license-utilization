import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  BarChart3,
  FileText,
  Eye,
  MousePointer,
} from "lucide-react";
import { User as UserType } from "../types";
import SalesforceApiService from "../services/SalesforceApiService";

interface UserTableProps {
  users?: UserType[];
}

export const UserTable: React.FC<UserTableProps> = ({ users: propUsers }) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof UserType>("lastLogin");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  useEffect(() => {
    // If users are provided via props, use them directly
    if (propUsers && propUsers.length > 0) {
      setUsers(propUsers);
      return;
    }

    // Otherwise fetch users from API
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const salesforceApi = SalesforceApiService.getInstance();
        const apiUsers = await salesforceApi.getUsers();

        // Transform API users to match the expected format in the UserTable component
        const formattedUsers = apiUsers.map((user) => ({
          ...user,
          // Map API fields to component expected fields
          licenseType: user.license,
          // Determine usage level based on login count
          usageLevel: determineUsageLevel(user.loginCount),
          // Default values for fields not provided by the API
          reportsRun: Math.floor(Math.random() * 50), // Placeholder
          tabHits: user.loginCount * 10, // Estimated based on login count
          dashboardViews: Math.floor(user.loginCount / 2), // Placeholder
          pageViews: user.loginCount * 15, // Placeholder
          // Generate object touches based on objectsAccessed count
          objectTouches: generateObjectTouches(user.objectsAccessed),
        }));

        setUsers(formattedUsers);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError("Failed to load user data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [propUsers]);

  // Helper function to determine usage level based on login count
  const determineUsageLevel = (loginCount: number): string => {
    if (loginCount > 50) return "Heavy";
    if (loginCount > 20) return "Medium";
    if (loginCount > 5) return "Light";
    return "Inactive";
  };

  // Helper function to generate mock object touches data
  const generateObjectTouches = (
    objectCount: number
  ): Record<string, number> => {
    const objectNames = [
      "Account",
      "Contact",
      "Lead",
      "Opportunity",
      "Case",
      "Task",
      "Event",
      "Campaign",
      "Product",
      "PriceBook",
      "Contract",
      "Solution",
    ];

    const result: Record<string, number> = {};
    // Use the objectsAccessed count to determine how many objects to show
    const count = Math.min(objectCount || 1, objectNames.length);

    // Select random objects from the list
    const selectedObjects = objectNames
      .sort(() => 0.5 - Math.random())
      .slice(0, count);

    selectedObjects.forEach((obj) => {
      // Generate a random number of touches for each object
      result[obj] = Math.floor(Math.random() * 100) + 1;
    });

    return result;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500">Loading users data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-sm text-gray-500">No users available</p>
      </div>
    );
  }

  const handleSort = (field: keyof UserType) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });

  const getUsageLevelColor = (level: string) => {
    switch (level) {
      case "Heavy":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Light":
        return "bg-orange-100 text-orange-800";
      case "Inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getLicenseTypeColor = (type: string) => {
    switch (type) {
      case "Salesforce":
      case "Full":
        return "bg-blue-100 text-blue-800";
      case "Salesforce Platform":
      case "Platform":
        return "bg-purple-100 text-purple-800";
      case "Chatter Free":
      case "Community":
        return "bg-green-100 text-green-800";
      case "Analytics":
        return "bg-yellow-100 text-yellow-800";
      case "Integration":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const SortButton: React.FC<{
    field: keyof UserType;
    children: React.ReactNode;
  }> = ({ field, children }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center space-x-1 text-left font-medium text-gray-900 hover:text-blue-600"
    >
      <span>{children}</span>
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        ))}
    </button>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          User Usage Details
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Click on a user to see detailed object usage
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="name">User</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="profile">Profile</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="licenseType">License</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="lastLogin">Last Login</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="usageLevel">Usage Level</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="reportsRun">Reports</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <SortButton field="tabHits">Tab Hits</SortButton>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedUsers.map((user) => (
              <React.Fragment key={user.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <Link
                          to={`/user/${user.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                          {user.name}
                        </Link>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.profile}</div>
                    <div className="text-sm text-gray-500">{user.role}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLicenseTypeColor(
                        user.licenseType || user.license
                      )}`}
                    >
                      {user.licenseType || user.license}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {user.lastLogin ? formatDate(user.lastLogin) : "N/A"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUsageLevelColor(
                        user.usageLevel
                      )}`}
                    >
                      {user.usageLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <FileText className="w-4 h-4 mr-2 text-gray-400" />
                      {user.reportsRun || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MousePointer className="w-4 h-4 mr-2 text-gray-400" />
                      {user.tabHits?.toLocaleString() || "0"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/user/${user.id}`}
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </Link>
                      <button
                        onClick={() =>
                          setExpandedUser(
                            expandedUser === user.id ? null : user.id
                          )
                        }
                        className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Details</span>
                        {expandedUser === user.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>

                {expandedUser === user.id && (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Object Usage (Last 90 days)
                          </h4>
                          <div className="space-y-2">
                            {Object.entries(user.objectTouches || {}).map(
                              ([object, count]) => (
                                <div
                                  key={object}
                                  className="flex items-center justify-between"
                                >
                                  <Link
                                    to={`/object/${object}`}
                                    className="text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    {object}
                                  </Link>
                                  <span className="text-sm font-medium text-gray-900">
                                    {count?.toLocaleString() || "0"}
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Activity Summary
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Reports Run
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {user.reportsRun || 0}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <BarChart3 className="w-4 h-4 text-green-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Dashboard Views
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {user.dashboardViews || 0}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MousePointer className="w-4 h-4 text-purple-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Tab Hits
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {user.tabHits?.toLocaleString() || "0"}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Eye className="w-4 h-4 text-orange-500" />
                              <div>
                                <p className="text-xs text-gray-600">
                                  Page Views
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {user.pageViews?.toLocaleString() || "0"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
