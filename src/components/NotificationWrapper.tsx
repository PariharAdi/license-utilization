import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationProvider } from '../contexts/NotificationContext';

interface NotificationWrapperProps {
  children: ReactNode;
}

export const NotificationWrapper: React.FC<NotificationWrapperProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  return (
    <NotificationProvider
      userId={isAuthenticated ? user?.userId : undefined}
      apiBaseUrl={apiBaseUrl}
    >
      {children}
    </NotificationProvider>
  );
};