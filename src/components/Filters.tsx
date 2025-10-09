import React from 'react';
import { Filter, X } from 'lucide-react';
import { FilterOptions } from '../types';

interface FiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClearFilters: () => void;
}

export const Filters: React.FC<FiltersProps> = ({ filters, onFiltersChange, onClearFilters }) => {
  const profileOptions = ['System Administrator', 'Sales User', 'Marketing User', 'Standard User', 'Customer Community User'];
  const roleOptions = ['VP Sales', 'Account Executive', 'Marketing Manager', 'Sales Rep', 'Partner User'];
  const licenseTypeOptions = ['Full', 'Platform', 'Community'];
  const usageLevelOptions = ['Heavy', 'Medium', 'Light', 'Inactive'];

  const handleFilterChange = (filterType: keyof FilterOptions, value: string) => {
    const currentValues = filters[filterType] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFiltersChange({
      ...filters,
      [filterType]: newValues
    });
  };

  const hasActiveFilters = Object.values(filters).some(filter => 
    Array.isArray(filter) ? filter.length > 0 : false
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <select
            value={filters.dateRange}
            onChange={(e) => onFiltersChange({ ...filters, dateRange: e.target.value as '90' | '180' | '365' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
            <option value="365">Last 365 days</option>
          </select>
        </div>

        {/* Profile Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Profile</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {profileOptions.map(profile => (
              <label key={profile} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.profile.includes(profile)}
                  onChange={() => handleFilterChange('profile', profile)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{profile}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {roleOptions.map(role => (
              <label key={role} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.role.includes(role)}
                  onChange={() => handleFilterChange('role', role)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{role}</span>
              </label>
            ))}
          </div>
        </div>

        {/* License Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">License Type</label>
          <div className="space-y-2">
            {licenseTypeOptions.map(license => (
              <label key={license} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.licenseType.includes(license)}
                  onChange={() => handleFilterChange('licenseType', license)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{license}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Usage Level Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Usage Level</label>
          <div className="space-y-2">
            {usageLevelOptions.map(level => (
              <label key={level} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.usageLevel.includes(level)}
                  onChange={() => handleFilterChange('usageLevel', level)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{level}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};