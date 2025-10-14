import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import SalesforceApiService from "../services/SalesforceApiService";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: any | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const salesforceService = SalesforceApiService.getInstance();

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = async () => {
    try {
      setIsLoading(true);
      const isValid = await salesforceService.checkAuthStatus();
      setIsAuthenticated(isValid);
      setError(null);
    } catch (error) {
      console.error("Authentication check failed:", error);
      setIsAuthenticated(false);
      setError("Authentication check failed");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      setError(null);

      await salesforceService.authenticate();
      setIsAuthenticated(true);
      // Optionally fetch user info here if available from service
      setUser(null);

      console.log("✅ Login successful");
    } catch (error) {
      console.error("❌ Login failed:", error);
      setError(error instanceof Error ? error.message : "Login failed");
      setIsAuthenticated(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await salesforceService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setError(null);
      console.log("✅ Logout successful");
    } catch (error) {
      console.error("❌ Logout failed:", error);
      // Still set as logged out even if API call fails
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
