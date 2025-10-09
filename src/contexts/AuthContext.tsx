import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, SalesforceUser } from '../types/auth';
import { apiService } from '../services/apiService';
import { API_ENDPOINTS } from '../config/api';

// Auth actions
type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: SalesforceUser }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  instanceUrl: null,
  isLoading: true,
  error: null
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload,
        accessToken: 'managed-by-backend', // Backend manages tokens via cookies
        instanceUrl: 'managed-by-backend',
        isLoading: false,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        instanceUrl: null,
        isLoading: false,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...initialState,
        isLoading: false
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
}

// Auth context
interface AuthContextType extends AuthState {
  login: () => void;
  logout: () => void;
  clearError: () => void;
  handleCallback: (code: string, state: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if backend is available
        const isBackendAvailable = await apiService.healthCheck();
        if (!isBackendAvailable) {
          console.warn('Backend is not available, using mock data mode');
          dispatch({ type: 'LOGOUT' });
          return;
        }

        // Check authentication status with backend
        const response = await apiService.get(API_ENDPOINTS.auth.status);
        if (response.success && response.data?.isAuthenticated) {
          // Get full user info
          const userResponse = await apiService.get(API_ENDPOINTS.auth.me);
          if (userResponse.success && userResponse.data) {
            dispatch({ type: 'LOGIN_SUCCESS', payload: userResponse.data.user });
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (error) {
        console.error('Session check failed:', error);
        dispatch({ type: 'LOGOUT' });
      }
    };

    checkSession();
  }, []);

  const login = async () => {
    try {
      dispatch({ type: 'LOGIN_START' });

      // Get Salesforce authorization URL from backend
      const response = await apiService.get(API_ENDPOINTS.auth.salesforce);
      if (response.success && response.data?.authUrl) {
        // Redirect to Salesforce
        window.location.href = response.data.authUrl;
      } else {
        throw new Error(response.error || 'Failed to get authorization URL');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  };

  const logout = async () => {
    try {
      await apiService.post(API_ENDPOINTS.auth.logout);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const handleCallback = async (code: string, state: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });

      // The backend handles the callback automatically via the redirect
      // We just need to check if we're now authenticated
      const response = await apiService.get(API_ENDPOINTS.auth.me);
      if (response.success && response.data) {
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.user });
      } else {
        throw new Error(response.error || 'Authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    clearError,
    handleCallback
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};