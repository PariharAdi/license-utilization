import { API_BASE_URL, API_CONFIG } from '../config/api';

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
      const response = await this.get('/health');
      return response.success;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
    }
  }
}

export const apiService = new ApiService();

export const logout = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.auth.logout}`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      credentials: API_CONFIG.credentials,
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};