import React from 'react';
import { BarChart3 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // DEMO MODE: Authentication bypassed for demonstration purposes
  // TODO: Remove this bypass when Salesforce SSO is fully integrated

  return <>{children}</>;
};