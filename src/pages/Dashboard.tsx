import React, { useState, useEffect } from 'react';
import { OverviewTiles } from '../components/OverviewTiles';
import { UsageChart } from '../components/UsageChart';
import { LicenseUtilization } from '../components/LicenseUtilization';
import { TopObjects } from '../components/TopObjects';
import { Filters } from '../components/Filters';
import { UserTable } from '../components/UserTable';
import { OptimizationCTA } from '../components/OptimizationCTA';
import { useFilters } from '../hooks/useFilters';
import { DashboardService } from '../services/dashboardService';
import { OrgOverview, User } from '../types';

interface DashboardProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ onRefresh, isLoading }) => {
  const [overview, setOverview] = useState<OrgOverview | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersPagination, setUsersPagination] = useState<any>({});
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMockMode, setIsMockMode] = useState(false);

  const { filters, setFilters, clearFilters } = useFilters([]);

  // Load data on component mount and when filters change
  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  // Check backend availability on mount
  useEffect(() => {
    const checkBackend = async () => {
      const isAvailable = await DashboardService.checkBackendAvailability();
      setIsMockMode(!isAvailable);
      if (!isAvailable) {
        console.warn('Backend not available, using mock data');
      }
    };

    checkBackend();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsDataLoading(true);
      setError(null);

      // Load overview and users in parallel
      const [overviewData, usersData] = await Promise.all([
        DashboardService.getOverview(),
        DashboardService.getUsers(filters, 1, 50),
      ]);

      setOverview(overviewData);
      setUsers(usersData.data);
      setUsersPagination(usersData.pagination);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setError(null);
      if (!isMockMode) {
        await DashboardService.refreshData();
      }
      await loadDashboardData();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    }
  };

  const handleExport = async () => {
    try {
      await DashboardService.exportUsers(filters);
    } catch (err) {
      console.error('Error exporting users:', err);
      setError(err instanceof Error ? err.message : 'Failed to export users');
    }
  };

  const handleOptimizeClick = () => {
    alert('Opening optimization consultation form...\n\nIn a real implementation, this would:\n- Open a contact form\n- Pre-fill with org ID\n- Track analytics event\n- Redirect to consultation booking');
  };

  // Calculate optimization metrics
  const unusedLicenses = overview
    ? (overview.licenseUtilization.full?.total - overview.licenseUtilization.full?.used || 0) +
      (overview.licenseUtilization.platform?.total - overview.licenseUtilization.platform?.used || 0) +
      (overview.licenseUtilization.community?.total - overview.licenseUtilization.community?.used || 0)
    : 0;

  const potentialSavings = overview
    ? ((overview.licenseUtilization.full?.total - overview.licenseUtilization.full?.used || 0) * 150) +
      ((overview.licenseUtilization.platform?.total - overview.licenseUtilization.platform?.used || 0) * 25) +
      ((overview.licenseUtilization.community?.total - overview.licenseUtilization.community?.used || 0) * 2)
    : 0;

  // Show loading state
  if (isDataLoading && !overview) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  // Show error state
  if (error) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <button
                  onClick={handleRefresh}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!overview) {
    return null;
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Mock mode indicator */}
      {isMockMode && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>Demo Mode:</strong> Backend not available. Using mock data for demonstration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Section */}
      <OverviewTiles overview={overview} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <UsageChart overview={overview} />
        <LicenseUtilization overview={overview} />
        <TopObjects overview={overview} />
      </div>

      {/* Optimization CTA */}
      <div className="mb-8">
        <OptimizationCTA
          potentialSavings={potentialSavings}
          unusedLicenses={unusedLicenses}
          onOptimizeClick={handleOptimizeClick}
        />
      </div>

      {/* Filters */}
      <Filters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {/* User Table */}
      <UserTable users={users} />

      {/* Loading overlay for data refresh */}
      {(isDataLoading && overview) && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-900">Loading data...</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};