import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type NotificationPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface NotificationPreferences {
  soundEnabled: boolean;
  defaultDuration: number;
  maxNotifications: number;
  position: NotificationPosition;
  animation: 'slide' | 'fade' | 'bounce' | 'scale';
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (message: string, type: Notification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  preferences: NotificationPreferences;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
}

const defaultPreferences: NotificationPreferences = {
  soundEnabled: true,
  defaultDuration: 5000,
  maxNotifications: 3,
  position: 'top-right',
  animation: 'slide',
};

// A simple beep sound encoded in base64
const BEEP_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => {
    const savedPrefs = localStorage.getItem('notificationPreferences');
    return savedPrefs ? JSON.parse(savedPrefs) : defaultPreferences;
  });

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notificationPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = useCallback((newPrefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...newPrefs }));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const showNotification = useCallback((message: string, type: Notification['type'], duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notificationDuration = duration || preferences.defaultDuration;

    setNotifications(prev => {
      // If we're at max notifications, remove the oldest one
      if (prev.length >= preferences.maxNotifications) {
        prev = prev.slice(1);
      }
      return [...prev, { id, message, type, duration: notificationDuration }];
    });

    // Play sound if enabled
    if (preferences.soundEnabled) {
      try {
        const audio = new Audio(BEEP_SOUND);
        audio.volume = 0.5; // Set volume to 50%
        audio.play().catch(() => {
          // Silently fail if sound can't be played
          console.debug('Could not play notification sound');
        });
      } catch {
        // Silently fail if sound can't be created
        console.debug('Could not create notification sound');
      }
    }

    // Auto-remove notification after duration
    setTimeout(() => {
      removeNotification(id);
    }, notificationDuration);
  }, [preferences.defaultDuration, preferences.maxNotifications, preferences.soundEnabled, removeNotification]);

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      showNotification, 
      removeNotification, 
      clearAllNotifications,
      preferences, 
      updatePreferences 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 