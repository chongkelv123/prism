// frontend/src/contexts/NotificationContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect } from 'react';
import notificationService, { Notification } from '../services/notification.service';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'time'>) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
  };

  useEffect(() => {
    // Only try to load notifications if user is authenticated
    if (isAuthenticated()) {
      loadNotifications();
    }
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.warn('Failed to load notifications, using empty array:', error);
      // Don't throw error, just use empty notifications
      setNotifications([]);
      setUnreadCount(0);
      
      // Check if it's a 503 error (service not available)
      if (error?.response?.status === 503) {
        console.info('Notification service not available - this is expected in development');
      }
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      // Still update locally even if API fails
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(prev - 1, 0));
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read', error);
      // Still update locally even if API fails
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'time'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `local-${Date.now()}`,
      read: false,
      time: 'Just now'
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      addNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};