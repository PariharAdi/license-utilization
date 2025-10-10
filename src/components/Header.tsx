import React from "react";
import {
  BarChart3,
  Settings,
  Download,
  RefreshCw,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import NotificationCenter from "./NotificationCenter";

interface HeaderProps {
  onRefresh: () => void;
  onExport: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  onExport,
  isLoading = false,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              License Utilization Inspector
            </h1>
            <p className="text-sm text-gray-600">
              {user?.organizationName ? `${user.organizationName} • ` : ""}
              Optimize your Salesforce license usage
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>Refresh</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          {/* Notification Center */}
          <NotificationCenter />

          <button className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5" />
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="flex items-center space-x-3">
              {user?.photoUrl ? (
                <img
                  src={user.photoUrl}
                  alt={user.displayName}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.displayName}
                </p>
                <p className="text-xs text-gray-500">{user?.profileName}</p>
              </div>
            </div>

            <button
              onClick={logout}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
