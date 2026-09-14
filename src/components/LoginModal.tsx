'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Lock,
  User,
  TrendingUp,
} from 'lucide-react';

export default function LoginScreen() {
  const { setUser, showToast, systemSettings } = useApp();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('يرجى إدخال اسم المستخدم وكلمة المرور', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      setUser(data.user);
      showToast(`مرحباً بك، ${data.user.full_name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'خطأ في تسجيل الدخول', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const demoAccounts = [
    { username: 'admin', label: 'محمد مصطفى شكر (المدير)', role: 'admin', balance: 'لوحة التحكم الشاملة' },
    { username: 'ahmed', label: 'أحمد محمود الشناوي (شريك)', role: 'partner', balance: 'محفظة: 135,000 ج.م' },
    { username: 'tarek', label: 'م. طارق عبد العزيز (شريك)', role: 'partner', balance: 'محفظة: 260,000 ج.م' },
    { username: 'sarah', label: 'د. سارة إبراهيم (شريك)', role: 'partner', balance: 'محفظة: 53,500 ج.م' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden text-slate-100">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-2xl shadow-emerald-900/60 mb-3">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {systemSettings?.system_name || 'مركز الشاطبي لإدارة محافظ الشركاء'}
          </h1>
          <p className="text-xs text-emerald-400 font-semibold">
            نظام مالي وإداري متكامل لمتابعة استثمارات البورصة وأتعاب الإدارة
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-7 rounded-3xl bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                اسم المستخدم
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="admin أو اسم المستخدم"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <User className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <Lock className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          تم تصميم النظام لضمان الدقة المحاسبية التامة وفصل أرصدة الشركاء
        </p>
      </div>
    </div>
  );
}
