import { API_BASE_URL, API_CONFIG } from '../config/api';
import type { User } from '../types';
import SalesforceApiService from './SalesforceApiService';

const salesforceService = SalesforceApiService.getInstance();

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...API_CONFIG,
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle different content types
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/csv')) {
        // For CSV exports, return the text directly
        const text = await response.text();
        return { success: true, data: text as T };
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);

      if (error instanceof TypeError && error.message.includes('fetch')) {
        return {
          success: false,
          error: 'Network error. Please check your connection and try again.',
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  // GET request
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, v.toString()));
          } else {
            searchParams.append(key, value.toString());
          }
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.request<T>(url, { method: 'GET' });
  }

  // POST request
  async post<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  // PUT request
  async put<T>(
    endpoint: string,
    data?: any,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Download file (for exports)
  async downloadFile(endpoint: string, filename: string, params?: Record<string, any>): Promise<void> {
    try {
      let url = `${this.baseURL}${endpoint}`;

      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(key, v.toString()));
            } else {
              searchParams.append(key, value.toString());
            }
          }
        });

        const queryString = searchParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      const response = await fetch(url, {
        ...API_CONFIG,
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error(`Download Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Check if backend is available
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/api/health');
      return response.success;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  }
}

/**
 * Transform Salesforce user to application user format
 */
function transformSalesforceUser(sfUser: any): User {
  return {
    id: sfUser.Id,
    name: sfUser.Name,
    username: sfUser.Username,
    email: sfUser.Email,
    status: sfUser.IsActive ? 'active' : 'inactive',
    license: sfUser.Profile?.Name || 'Unknown',
    profile: sfUser.Profile?.Name || 'Unknown',
    role: sfUser.UserRole?.Name || 'No Role',
    lastLogin: new Date().toISOString(),
    loginCount: 0,
    objectsAccessed: 0,
  };
}

export const apiService = new ApiService();

export const getUsers = async (filters?: {
  license?: string;
  status?: string;
  profile?: string;
  role?: string;
}): Promise<User[]> => {
  try {
    let sfUsers;

    if (filters && Object.keys(filters).length > 0) {
      sfUsers = await salesforceService.getFilteredUsers(filters);
    } else {
      sfUsers = await salesforceService.getUsers();
    }

    return sfUsers.map(transformSalesforceUser);
  } catch (error) {
    console.error('Error fetching users from Salesforce:', error);
    throw error;
  }
};

export const getUserById = async (userId: string): Promise<User> => {
  try {
    const sfUser = await salesforceService.getUserById(userId);
    return transformSalesforceUser(sfUser);
  } catch (error) {
    console.error('Error fetching user details from Salesforce:', error);
    throw error;
  }
};

export const getUserSummary = async () => {
  try {
    const users = await getUsers();

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const inactiveUsers = totalUsers - activeUsers;

    const licenseDistribution = users.reduce((acc, user) => {
      acc[user.license] = (acc[user.license] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      utilizationRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
      licenseDistribution,
    };
  } catch (error) {
    console.error('Error fetching user summary from Salesforce:', error);
    throw error;
  }
};

export const getFilterOptions = async () => {
  try {
    const users = await getUsers();

    return {
      licenses: [...new Set(users.map(u => u.license))],
      profiles: [...new Set(users.map(u => u.profile))],
      roles: [...new Set(users.map(u => u.role).filter(r => r !== 'No Role'))],
      statuses: ['active', 'inactive'],
    };
  } catch (error) {
    console.error('Error fetching filter options from Salesforce:', error);
    throw error;
  }
};

export const exportUsers = async (users: User[]): Promise<Blob> => {
  const headers = ['Name', 'Username', 'Email', 'Status', 'License', 'Profile', 'Role'];
  const csvContent = [
    headers.join(','),
    ...users.map(u =>
      [u.name, u.username, u.email, u.status, u.license, u.profile, u.role]
        .map(field => `"${field}"`)
        .join(',')
    ),
  ].join('\n');

  return new Blob([csvContent], { type: 'text/csv' });
};

export const logout = async (): Promise<void> => {
  salesforceService.clearToken();
};