import React from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Filter } from 'lucide-react';
import { UserTable } from '../components/UserTable';
import { mockUsers } from '../data/mockData';
import { User } from '../types';

export const FilteredUserListPage: React.FC = () => {
  const { filterType } = useParams<{ filterType: string }>();
  const [searchParams] = useSearchParams();
  const filterValue = searchParams.get('value');

  const getFilteredUsers = (): User[] => {
    if (!filterType || !filterValue) return mockUsers;

    switch (filterType) {
      case 'usage-level':
        return mockUsers.filter(user => user.usageLevel === filterValue);
      case 'license-type':
        return mockUsers.filter(user => user.licenseType === filterValue);
      case 'profile':
        return mockUsers.filter(user => user.profile === filterValue);
      case 'role':
        return mockUsers.filter(user => user.role === filterValue);
      default:
        return mockUsers;
    }
  };

  const filteredUsers = getFilteredUsers();

  const getPageTitle = (): string => {
    if (!filterType || !filterValue) return 'All Users';
    
    switch (filterType) {
      case 'usage-level':
        return `${filterValue} Users`;
      case 'license-type':
        return `${filterValue} License Users`;
      case 'profile':
        return `${filterValue} Profile Users`;
      case 'role':
        return `${filterValue} Role Users`;
      default:
        return 'Filtered Users';
    }
  };

  const getPageDescription = (): string => {
    return `Showing ${filteredUsers.length} users matching the selected criteria`;
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
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{getPageTitle()}</h1>
              <p className="text-lg text-gray-600">{getPageDescription()}</p>
            </div>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center space-x-3">
            <Filter className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Active Filter</h3>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <span className="text-sm text-gray-600">Filter Type:</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {filterType?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
            <span className="text-sm text-gray-600">Value:</span>
            <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm font-medium rounded-full">
              {filterValue}
            </span>
          </div>
        </div>

        {/* Results Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Object Touches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredUsers.reduce((sum, user) => 
                    sum + Object.values(user.objectTouches).reduce((userSum, count) => userSum + count, 0), 0
                  ).toLocaleString()}
                </p>
              </div>
              <Filter className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports Run</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredUsers.reduce((sum, user) => sum + user.reportsRun, 0)}
                </p>
              </div>
              <Filter className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Tab Hits</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(filteredUsers.reduce((sum, user) => sum + user.tabHits, 0) / filteredUsers.length).toLocaleString()}
                </p>
              </div>
              <Filter className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* User Table */}
        <UserTable users={filteredUsers} />
      </div>
    </div>
  );
};