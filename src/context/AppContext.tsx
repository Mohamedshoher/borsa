'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Notification, SystemSettings } from '@/lib/types';

interface ToastInfo {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface AppContextType {
  user: User | null;
  setUser: (u: User | null) => void;
  isLoadingUser: boolean;
  currentView: string;
  setCurrentView: (view: string) => void;
  selectedPartnerId: string | null;
  setSelectedPartnerId: (id: string | null) => void;
  notifications: Notification[];
  unreadCount: number;
  toasts: ToastInfo[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  quickSwitchUser: (username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
  systemSettings: SystemSettings | null;
  fetchNotifications: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastInfo[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setIsLoadingUser(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.role === 'partner') {
          setSelectedPartnerId(data.user.partner_id);
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to fetch user:', e);
      setUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSystemSettings(data.settings);
      }
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
    fetchSettings();
  }, [fetchCurrentUser, fetchSettings]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, refreshKey, fetchNotifications]);

  const quickSwitchUser = async (username: string) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: username }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.role === 'partner') {
          setSelectedPartnerId(data.user.partner_id);
        } else {
          setSelectedPartnerId(null);
        }
        setCurrentView('dashboard');
        triggerRefresh();
        showToast(`تم التبديل بنجاح إلى حساب: ${data.user.full_name} (${data.user.role === 'admin' ? 'مدير' : 'شريك'})`, 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'فشل التبديل', 'error');
      }
    } catch (e: any) {
      showToast(e.message || 'خطأ في الاتصال', 'error');
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setSelectedPartnerId(null);
      setCurrentView('dashboard');
      showToast('تم تسجيل الخروج بنجاح', 'info');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isLoadingUser,
        currentView,
        setCurrentView,
        selectedPartnerId,
        setSelectedPartnerId,
        notifications,
        unreadCount,
        toasts,
        showToast,
        removeToast,
        quickSwitchUser,
        logout,
        refreshKey,
        triggerRefresh,
        systemSettings,
        fetchNotifications,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
