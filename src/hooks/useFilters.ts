import { useState, useMemo } from 'react';
import { User, FilterOptions } from '../types';

export const useFilters = (users: User[]) => {
  const [filters, setFilters] = useState<FilterOptions>({
    profile: [],
    role: [],
    licenseType: [],
    usageLevel: [],
    dateRange: '90'
  });

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (filters.profile.length > 0 && !filters.profile.includes(user.profile)) {
        return false;
      }
      if (filters.role.length > 0 && !filters.role.includes(user.role)) {
        return false;
      }
      if (filters.licenseType.length > 0 && !filters.licenseType.includes(user.licenseType)) {
        return false;
      }
      if (filters.usageLevel.length > 0 && !filters.usageLevel.includes(user.usageLevel)) {
        return false;
      }
      return true;
    });
  }, [users, filters]);

  const clearFilters = () => {
    setFilters({
      profile: [],
      role: [],
      licenseType: [],
      usageLevel: [],
      dateRange: '90'
    });
  };

  return {
    filters,
    setFilters,
    filteredUsers,
    clearFilters
  };
};