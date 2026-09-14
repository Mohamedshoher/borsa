'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ReceiptText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Percent,
  FileSpreadsheet,
  FileText,
  ShieldAlert,
  Settings,
  Clock,
  TrendingUp,
  LogOut,
  Wallet,
  Coins,
  Send,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const { user, currentView, setCurrentView, unreadCount, logout, systemSettings } = useApp();

  const isAdmin = user?.role === 'admin';

  const adminNavItems = [
    { id: 'dashboard', label: 'لوحة التحكم المركزية', icon: LayoutDashboard },
    { id: 'partners', label: 'إدارة الشركاء', icon: Users },
    { id: 'portfolios', label: 'المحافظ الاستثمارية', icon: Briefcase },
    { id: 'transactions', label: 'سجل القيود والعمليات', icon: ReceiptText },
    { id: 'deposits_withdrawals', label: 'الإيداعات والسحوبات', icon: Coins },
    { id: 'withdrawal_requests', label: 'طلبات السحب', icon: ArrowUpFromLine },
    { id: 'management_fees', label: 'أتعاب الإدارة (2%)', icon: Percent },
    { id: 'statement', label: 'كشف حساب شريك', icon: FileText },
    { id: 'reports', label: 'التقارير والتصدير (Excel/PDF)', icon: FileSpreadsheet },
    { id: 'audit', label: 'سجل التدقيق والمراقبة', icon: ShieldAlert },
    { id: 'settings', label: 'إعدادات النظام', icon: Settings },
  ];

  const partnerNavItems = [
    { id: 'dashboard', label: 'محفظتي الاستثمارية', icon: Wallet },
    { id: 'statement', label: 'كشف الحساب التفصيلي', icon: FileText },
    { id: 'withdrawal_requests', label: 'طلبات السحب', icon: Send },
    { id: 'transactions', label: 'سجل الحركات والأتعاب', icon: ReceiptText },
  ];

  const items = isAdmin ? adminNavItems : partnerNavItems;

  const handleItemClick = (id: string) => {
    setCurrentView(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-72 bg-slate-900 text-slate-100 flex flex-col border-l border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/40">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-base text-white truncate leading-tight">
              {systemSettings?.system_name || 'إدارة محافظ الشركاء'}
            </h1>
            <p className="text-xs text-emerald-400 font-medium truncate mt-0.5">
              مركز الشاطبي للاستثمار
            </p>
          </div>
        </div>

        {/* User Identity Chip */}
        <div className="p-4 mx-3 my-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400 border border-slate-600">
              {user?.full_name?.charAt(0) || 'م'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{user?.full_name || 'غير مسجل'}</p>
              <span
                className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 ${
                  isAdmin
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                }`}
              >
                {isAdmin ? 'مدير الاستثمار' : 'شريك مستثمر'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="flex-1 text-right truncate">{item.label}</span>
                {item.id === 'withdrawal_requests' && unreadCount > 0 && isAdmin && (
                  <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    تنبيه
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Logout & Settings info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
