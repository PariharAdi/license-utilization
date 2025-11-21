const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  status: 'active' | 'inactive';
  license: string;
  profile: string;
  role: string;
  lastLogin: string;
  loginCount: number;
  objectsAccessed: number;
}

class SalesforceApiService {
  private static instance: SalesforceApiService;

  private constructor() { }

  public static getInstance(): SalesforceApiService {
    if (!SalesforceApiService.instance) {
      SalesforceApiService.instance = new SalesforceApiService();
    }
    return SalesforceApiService.instance;
  }

  /**
   * Authenticate with Salesforce via backend
   */
  async authenticate(): Promise<void> {
    try {
      console.log('🔄 Authenticating via backend...');
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      console.log('✅ Authenticated successfully via backend');
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(): Promise<boolean> {
    try {
      console.log('🔄 Checking auth status...');
      const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn(`Auth status check failed: ${response.status}`);
        return false;
      }

      const data: ApiResponse = await response.json();
      const isAuthenticated = data.success && data.data?.authenticated;
      console.log(`✅ Auth status: ${isAuthenticated}`);
      return isAuthenticated;
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      return false;
    }
  }

  /**
   * Get all users from backend
   */
  async getUsers(): Promise<User[]> {
    try {
      console.log('🔄 Fetching users...');
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      console.log(`✅ Fetched ${data.data?.data?.length || 0} users`);
      return data.data?.data || [];
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user');
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch user');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/overview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        console.warn('Logout request failed, but continuing...');
      }

      console.log('✅ Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Don't throw error for logout, just log it
    }
  }
}

export default SalesforceApiService;