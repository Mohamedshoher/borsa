'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Menu,
  Bell,
  UserCheck,
  Check,
  PlusCircle,
  Calendar,
  Sparkles,
  ShieldCheck,
  User,
  CheckCheck,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface NavbarProps {
  setMobileOpen: (open: boolean) => void;
  openAddPartnerModal: () => void;
}

export default function Navbar({ setMobileOpen, openAddPartnerModal }: NavbarProps) {
  const {
    user,
    quickSwitchUser,
    notifications,
    unreadCount,
    fetchNotifications,
    triggerRefresh,
    systemSettings,
  } = useApp();

  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  const notifRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_all: true }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const markSingleRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_id: notifId }),
      });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const demoAccounts = [
    { username: 'admin', label: 'محمد مصطفى شكر (المدير)', role: 'admin', desc: 'صلاحيات كاملة لجميع المحافظ والعمليات' },
    { username: 'ahmed', label: 'أحمد محمود الشناوي (شريك)', role: 'partner', desc: 'رأس مال 100,000 ج.م + إيداع وأرباح' },
    { username: 'tarek', label: 'م. طارق عبد العزيز (شريك)', role: 'partner', desc: 'رأس مال 250,000 ج.م + أرباح وسحب' },
    { username: 'sarah', label: 'د. سارة إبراهيم (شريك)', role: 'partner', desc: 'رأس مال 50,000 ج.م + طلب سحب معلق' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm">
      {/* Right Side: Toggle + Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
            <span>مرحباً، {user?.full_name || 'زائر'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {user?.role === 'admin' ? 'لوحة الإدارة الشاملة' : 'بوابة الشريك'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(new Date().toISOString())}</span>
            <span>•</span>
            <span>{currentTime}</span>
          </div>
        </div>
      </div>

      {/* Left Side: Role Quick Switcher + Notifications + Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Role Switcher Dropdown */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold transition-all shadow-sm"
            title="تبديل سريع بين حساب المدير وحسابات الشركاء التجريبية"
          >
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline">تبديل الحساب التجريبي</span>
            <span className="md:hidden">تبديل</span>
          </button>

          {showRoleDropdown && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  اختر حساباً للتجربة المباشرة
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="py-1">
                {demoAccounts.map((acc) => {
                  const isCurrent = user?.username === acc.username;
                  return (
                    <button
                      key={acc.username}
                      onClick={() => {
                        quickSwitchUser(acc.username);
                        setShowRoleDropdown(false);
                      }}
                      className={`w-full text-right px-4 py-2.5 flex items-start gap-3 transition-colors ${
                        isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="mt-0.5">
                        {acc.role === 'admin' ? (
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <User className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold truncate">{acc.label}</span>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{acc.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  الإشعارات والتنبيهات ({notifications.length})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] font-semibold text-emerald-600 hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>تمييز الكل كمقروء</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">لا توجد إشعارات حالياً</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markSingleRead(notif.id)}
                      className={`p-3 text-right cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        notif.is_read === 0
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          : 'opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {notif.title}
                        </span>
                        {notif.is_read === 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Partner Quick Action (Admin Only) */}
        {user?.role === 'admin' && (
          <button
            onClick={openAddPartnerModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">إضافة شريك جديد</span>
            <span className="sm:hidden">إضافة</span>
          </button>
        )}
      </div>
    </header>
  );
}
