import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: 'license_threshold' | 'inactive_users' | 'sync_complete' | 'error_alert' | 'system_alert';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  isRead?: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  websocket: boolean;
  types: {
    license_threshold: boolean;
    inactive_users: boolean;
    sync_complete: boolean;
    error_alert: boolean;
    system_alert: boolean;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  preferences: NotificationPreferences;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  updatePreferences: (preferences: NotificationPreferences) => void;
  clearNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  apiBaseUrl?: string;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  userId,
  apiBaseUrl = 'http://localhost:3001'
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    websocket: true,
    types: {
      license_threshold: true,
      inactive_users: true,
      sync_complete: false,
      error_alert: true,
      system_alert: true,
    }
  });

  useEffect(() => {
    // Only connect if we have a user ID (means we're authenticated)
    if (!userId) {
      return;
    }

    // Initialize Socket.IO connection
    const newSocket = io(apiBaseUrl, {
      withCredentials: true, // Include cookies for authentication
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);

      // Subscribe to notifications based on preferences
      newSocket.emit('subscribe_notifications', preferences);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Notification event handlers
    newSocket.on('notification', (notification: Notification) => {
      console.log('🔔 New notification:', notification);

      // Add notification to the list
      setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100

      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        showBrowserNotification(notification);
      }
    });

    newSocket.on('subscription_updated', (result) => {
      if (result.success) {
        console.log('✅ Notification preferences updated');
      } else {
        console.error('❌ Failed to update notification preferences:', result.error);
      }
    });

    newSocket.on('notification_marked_read', (result) => {
      if (result.success) {
        console.log('✅ Notification marked as read:', result.notificationId);
      } else {
        console.error('❌ Failed to mark notification as read');
      }
    });

    setSocket(newSocket);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Browser notification permission:', permission);
      });
    }

    // Load notification history
    loadNotificationHistory();

    return () => {
      console.log('🔌 Disconnecting WebSocket');
      newSocket.disconnect();
    };
  }, [userId, apiBaseUrl]);

  const loadNotificationHistory = async () => {
    if (!userId) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/notifications`, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const history = await response.json();
        setNotifications(history);
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
    }
  };

  const showBrowserNotification = (notification: Notification) => {
    if (Notification.permission !== 'granted') return;

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/favicon.ico',
      tag: notification.id,
      badge: '/favicon.ico',
      requireInteraction: notification.priority === 'critical',
    });

    // Auto-close after 5 seconds for non-critical notifications
    if (notification.priority !== 'critical') {
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }

    browserNotification.onclick = () => {
      window.focus();
      markAsRead(notification.id);
      browserNotification.close();
    };
  };

  const markAsRead = (notificationId: string) => {
    // Update local state
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    );

    // Send to backend
    if (socket) {
      socket.emit('mark_notification_read', notificationId);
    }
  };

  const markAllAsRead = () => {
    // Update local state
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );

    // Send to backend for each notification
    notifications.filter(n => !n.isRead).forEach(notification => {
      if (socket) {
        socket.emit('mark_notification_read', notification.id);
      }
    });
  };

  const updatePreferences = (newPreferences: NotificationPreferences) => {
    setPreferences(newPreferences);

    // Send to backend
    if (socket) {
      socket.emit('subscribe_notifications', newPreferences);
    }

    // Save to localStorage
    localStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
  };

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('notification_preferences');
    if (savedPreferences) {
      try {
        setPreferences(JSON.parse(savedPreferences));
      } catch (error) {
        console.error('Failed to parse saved notification preferences:', error);
      }
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const contextValue: NotificationContextType = {
    notifications,
    unreadCount,
    isConnected,
    preferences,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    clearNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};