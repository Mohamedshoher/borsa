'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  ShieldCheck,
  Save,
  RotateCcw,
  Percent,
  Building,
  User,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  CloudUpload,
  Lock,
  KeyRound,
} from 'lucide-react';
import { SystemSettings } from '@/lib/types';

export default function SettingsView() {
  const { systemSettings, showToast, triggerRefresh, refreshKey } = useApp();

  const [systemName, setSystemName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [currencySymbol, setCurrencySymbol] = useState('ج.م');
  const [feeRate, setFeeRate] = useState(2.0);
  const [feeBasis, setFeeBasis] = useState('VALUATION');
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);

  useEffect(() => {
    if (systemSettings) {
      setSystemName(systemSettings.system_name);
      setManagerName(systemSettings.manager_name);
      setCurrency(systemSettings.currency);
      setCurrencySymbol(systemSettings.currency_symbol);
      setFeeRate(systemSettings.default_mgmt_fee_rate);
      setFeeBasis(systemSettings.mgmt_fee_basis);
      setMonthStartDay(systemSettings.accounting_month_start_day);
      setNotifEnabled(systemSettings.notifications_enabled);
    }
  }, [systemSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_name: systemName.trim(),
          manager_name: managerName.trim(),
          currency,
          currency_symbol: currencySymbol,
          default_mgmt_fee_rate: feeRate,
          mgmt_fee_basis: feeBasis,
          accounting_month_start_day: monthStartDay,
          notifications_enabled: notifEnabled,
        }),
      });

      if (!res.ok) throw new Error('فشل حفظ الإعدادات');
      showToast('تم حفظ إعدادات النظام بنجاح', 'success');
      triggerRefresh();
    } catch (err: any) {
      showToast(err.message || 'خطأ في الحفظ', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSeed = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في إعادة ضبط النظام إلى البيانات التجريبية الافتراضية؟')) {
      return;
    }
    try {
      setIsResetting(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        showToast('تمت إعادة ضبط البيانات التجريبية بنجاح', 'success');
        triggerRefresh();
      }
    } catch (e) {
      showToast('فشلت إعادة الضبط', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSyncSupabase = async () => {
    try {
      setIsSyncingSupabase(true);
      const res = await fetch('/api/supabase/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'تمت مزامنة البيانات مع Supabase بنجاح!', 'success');
        triggerRefresh();
      } else {
        showToast(data.error || 'فشلت المزامنة، يرجى التحقق من متغيرات البيئة ومخطط SQL', 'error');
      }
    } catch (e: any) {
      showToast('حدث خطأ أثناء الاتصال بقاعدة بيانات Supabase', 'error');
    } finally {
      setIsSyncingSupabase(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      showToast('كلمة المرور الجديدة يجب أن تكون 4 أحرف أو أرقام على الأقل', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'error');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير كلمة المرور');

      showToast(data.message || 'تم تغيير كلمة المرور بنجاح', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تغيير كلمة المرور', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">إعدادات النظام والسياسة المالية</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          تخصيص اسم المنصة، نسبة أتعاب الإدارة الافتراضية، وبداية الشهر المحاسبي.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Identity & Manager */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-600" />
            <span>بيانات المنصة ومدير الاستثمار</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                اسم النظام / المركز
              </label>
              <input
                type="text"
                required
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                اسم مدير الاستثمار المسؤول
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Financial Policy & Management Fees */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="w-4 h-4 text-purple-600" />
            <span>السياسة المالية وأتعاب الإدارة</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                نسبة أتعاب الإدارة الافتراضية (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  required
                  value={feeRate}
                  onChange={(e) => setFeeRate(parseFloat(e.target.value) || 2.0)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                العملة المعتمدة
              </label>
              <input
                type="text"
                disabled
                value="جنيه مصري (EGP - ج.م)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-500 text-xs font-semibold cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                يوم بداية الشهر المحاسبي
              </label>
              <input
                type="number"
                min="1"
                max="28"
                value={monthStartDay}
                onChange={(e) => setMonthStartDay(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Change Password */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <span>تغيير كلمة المرور لحساب المدير (admin)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور الحالية
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                كلمة المرور الجديدة
              </label>
              <input
                type="password"
                placeholder="أدخل كلمة المرور الجديدة"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <input
                type="password"
                placeholder="أعد إدخال كلمة المرور"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleChangePassword}
              disabled={isChangingPassword || !newPassword}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-950/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isChangingPassword ? 'جاري التحديث...' : 'تحديث كلمة المرور'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Supabase Cloud Database Integration */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-800/40 shadow-sm space-y-4 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-950/40">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>قاعدة بيانات Supabase (PostgreSQL) السحابية</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    جاهز للنشر أونلاين
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  تم إعداد وتجهيز ملف المخطط السكربت السحابي <code className="text-emerald-400 font-mono">supabase_schema.sql</code>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncSupabase}
              disabled={isSyncingSupabase}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50"
            >
              <CloudUpload className={`w-4 h-4 ${isSyncingSupabase ? 'animate-spin' : ''}`} />
              <span>{isSyncingSupabase ? 'جاري المزامنة...' : 'مزامنة البيانات الحالية إلى Supabase'}</span>
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-slate-200">🚀 خطوات الربط والنشر السحابي السريع:</div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-400 leading-relaxed">
              <li>أنشئ مشروعاً مجانياً على <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-bold">Supabase.com</a>.</li>
              <li>افتح <strong>SQL Editor</strong> في Supabase وقم بلصق وتشغيل محتويات ملف <code className="text-white bg-slate-800 px-1 py-0.5 rounded">supabase_schema.sql</code> لإنشاء كافة الجداول الـ 11 والفهارس تلقائياً.</li>
              <li>ضع الـ <code className="text-white bg-slate-800 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> و <code className="text-white bg-slate-800 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> في ملف <code className="text-white bg-slate-800 px-1 py-0.5 rounded">.env.local</code> أو في إعدادات النشر على Vercel / Netlify.</li>
              <li>اضغط زر <strong>&quot;مزامنة البيانات الحالية إلى Supabase&quot;</strong> أعلاه لرفع كافة الحسابات والشركاء والمحافظ بضغطة زر واحدة.</li>
            </ol>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleResetSeed}
            disabled={isResetting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{isResetting ? 'جاري الضبط...' : 'إعادة تهيئة البيانات التجريبية'}</span>
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
